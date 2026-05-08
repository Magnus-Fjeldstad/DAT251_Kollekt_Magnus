package com.kollekt.service

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.kollekt.api.dto.CreateMessageRequest
import com.kollekt.api.dto.CreatePollRequest
import com.kollekt.api.dto.MessageDto
import com.kollekt.api.dto.PollDto
import com.kollekt.api.dto.PollOptionDto
import com.kollekt.api.dto.ReactionDto
import com.kollekt.domain.ChatMessage
import com.kollekt.domain.MemberStatus
import com.kollekt.repository.ChatMessageListItem
import com.kollekt.repository.ChatMessageRepository
import com.kollekt.repository.MemberRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.time.LocalDateTime
import java.util.Base64

@Service
class ChatOperations(
    private val chatMessageRepository: ChatMessageRepository,
    private val memberRepository: MemberRepository,
    private val eventPublisher: IntegrationEventPublisher,
    private val realtimeUpdateService: RealtimeUpdateService,
    private val notificationService: NotificationService,
    private val collectiveAccessService: CollectiveAccessService,
) {
    private val objectMapper = jacksonObjectMapper()
    private val allowedReactionEmojis = setOf("👍", "❤️", "😂", "🎉", "😮")
    private val maxChatImageBytes = 5 * 1024 * 1024L

    fun getMessages(memberName: String): List<MessageDto> {
        val collectiveCode = collectiveAccessService.requireCollectiveCodeByMemberName(memberName)
        return chatMessageRepository
            .findListItemsByCollectiveCode(collectiveCode)
            .map { it.toDto() }
    }

    @Transactional
    fun createMessage(
        request: CreateMessageRequest,
        actorName: String,
    ): MessageDto {
        val collectiveCode = collectiveAccessService.requireCollectiveCodeByMemberName(actorName)
        val normalizedText = request.text.trim()
        require(normalizedText.isNotBlank()) { "Message text is required" }
        val replyToMessageId =
            request.replyToMessageId?.let { referencedMessageId ->
                val referencedMessage =
                    chatMessageRepository
                        .findById(referencedMessageId)
                        .orElseThrow { IllegalArgumentException("Referenced message not found") }
                require(referencedMessage.collectiveCode == collectiveCode) { "Referenced message not found" }
                require(!chatMessageRepository.existsByReplyToMessageId(referencedMessage.id)) { "Message already has a reply" }
                referencedMessage.id
            }
        val saved =
            chatMessageRepository.save(
                ChatMessage(
                    sender = actorName,
                    collectiveCode = collectiveCode,
                    text = normalizedText,
                    replyToMessageId = replyToMessageId,
                    timestamp = LocalDateTime.now(),
                ),
            )

        val dto = saved.toDto()
        eventPublisher.chatEvent("MESSAGE_CREATED", dto)
        realtimeUpdateService.publish(collectiveCode, "MESSAGE_CREATED", dto)
        notifyOtherMembers(collectiveCode, actorName, normalizedText, "NEW_MESSAGE")
        return dto
    }

    @Transactional
    fun createImageMessage(
        image: MultipartFile,
        caption: String?,
        actorName: String,
    ): MessageDto {
        require(!image.isEmpty) { "Image is required" }
        val contentType =
            image.contentType
                ?.trim()
                .orEmpty()
                .lowercase()
        require(contentType.startsWith("image/")) { "Only image uploads are supported" }
        require(image.size <= maxChatImageBytes) { "Image is too large (max 5 MB)" }

        val collectiveCode = collectiveAccessService.requireCollectiveCodeByMemberName(actorName)
        val normalizedCaption = caption?.trim().orEmpty()
        val payload = Base64.getEncoder().encodeToString(image.bytes)

        val saved =
            chatMessageRepository.save(
                ChatMessage(
                    sender = actorName,
                    collectiveCode = collectiveCode,
                    text = normalizedCaption,
                    imageData = payload,
                    imageMimeType = contentType,
                    imageFileName = image.originalFilename?.take(255),
                    timestamp = LocalDateTime.now(),
                ),
            )

        val dto = saved.toDto()
        eventPublisher.chatEvent("MESSAGE_CREATED", dto)
        realtimeUpdateService.publish(collectiveCode, "MESSAGE_CREATED", dto)
        val previewText = if (normalizedCaption.isNotBlank()) normalizedCaption else "[Image]"
        notifyOtherMembers(collectiveCode, actorName, previewText, "NEW_MESSAGE")
        return dto
    }

    @Transactional
    fun addReaction(
        messageId: Long,
        emoji: String,
        actorName: String,
    ): MessageDto {
        require(emoji in allowedReactionEmojis) { "Unsupported reaction" }

        val message =
            chatMessageRepository
                .findById(messageId)
                .orElseThrow { IllegalArgumentException("Message not found") }

        val collectiveCode = collectiveAccessService.requireCollectiveCodeByMemberName(actorName)
        require(message.collectiveCode == collectiveCode) { "Message not found" }

        val reactions =
            message
                .reactionMap()
                .mapValues { (_, users) -> users.toMutableSet() }
                .toMutableMap()

        reactions.values.forEach { users -> users.remove(actorName) }
        reactions.entries.removeIf { (_, users) -> users.isEmpty() }

        val users = reactions.getOrPut(emoji) { mutableSetOf() }
        users.add(actorName)

        val updated =
            chatMessageRepository.save(
                message.copy(reactions = objectMapper.writeValueAsString(reactions.toJsonMap())),
            )

        val dto = updated.toDto()
        realtimeUpdateService.publish(collectiveCode, "MESSAGE_REACTION_UPDATED", dto)
        return dto
    }

    @Transactional
    fun removeReaction(
        messageId: Long,
        emoji: String,
        actorName: String,
    ): MessageDto {
        require(emoji in allowedReactionEmojis) { "Unsupported reaction" }

        val message =
            chatMessageRepository
                .findById(messageId)
                .orElseThrow { IllegalArgumentException("Message not found") }

        val collectiveCode = collectiveAccessService.requireCollectiveCodeByMemberName(actorName)
        require(message.collectiveCode == collectiveCode) { "Message not found" }

        val reactions = message.reactionMap().toMutableMap()
        val users = reactions[emoji]?.toMutableSet() ?: mutableSetOf()
        users.remove(actorName)

        if (users.isEmpty()) {
            reactions.remove(emoji)
        } else {
            reactions[emoji] = users
        }

        val updated =
            chatMessageRepository.save(
                message.copy(reactions = objectMapper.writeValueAsString(reactions.toJsonMap())),
            )

        val dto = updated.toDto()
        realtimeUpdateService.publish(collectiveCode, "MESSAGE_REACTION_UPDATED", dto)
        return dto
    }

    @Transactional
    fun createPoll(
        request: CreatePollRequest,
        actorName: String,
    ): MessageDto {
        val collectiveCode = collectiveAccessService.requireCollectiveCodeByMemberName(actorName)

        val question = request.question.trim()
        require(question.isNotBlank()) { "Poll question is required" }

        val options =
            request.options
                .map { it.trim() }
                .filter { it.isNotBlank() }
                .distinct()
        require(options.size in 2..6) { "Poll must have between 2 and 6 unique options" }

        val payload =
            PollPayload(
                question = question,
                options =
                    options.mapIndexed { index, text ->
                        PollOptionPayload(id = index, text = text, users = emptyList())
                    },
            )

        val saved =
            chatMessageRepository.save(
                ChatMessage(
                    sender = actorName,
                    collectiveCode = collectiveCode,
                    text = "📊 $question",
                    timestamp = LocalDateTime.now(),
                    poll = objectMapper.writeValueAsString(payload),
                ),
            )

        val dto = saved.toDto()
        eventPublisher.chatEvent("MESSAGE_CREATED", dto)
        realtimeUpdateService.publish(collectiveCode, "MESSAGE_CREATED", dto)
        notifyOtherMembers(collectiveCode, actorName, "📊 $question", "NEW_MESSAGE")
        return dto
    }

    @Transactional
    fun votePoll(
        messageId: Long,
        optionId: Int,
        actorName: String,
    ): MessageDto {
        val message =
            chatMessageRepository
                .findById(messageId)
                .orElseThrow { IllegalArgumentException("Message not found") }

        val collectiveCode = collectiveAccessService.requireCollectiveCodeByMemberName(actorName)
        require(message.collectiveCode == collectiveCode) { "Message not found" }

        val poll = message.pollPayload() ?: throw IllegalArgumentException("Message is not a poll")
        require(poll.options.any { it.id == optionId }) { "Invalid poll option" }

        val updatedOptions =
            poll.options.map { option ->
                val usersWithoutActor = option.users.filter { it != actorName }
                if (option.id == optionId) {
                    option.copy(users = (usersWithoutActor + actorName).distinct().sorted())
                } else {
                    option.copy(users = usersWithoutActor.sorted())
                }
            }

        val updated =
            chatMessageRepository.save(
                message.copy(
                    poll = objectMapper.writeValueAsString(poll.copy(options = updatedOptions)),
                ),
            )

        val dto = updated.toDto()
        realtimeUpdateService.publish(collectiveCode, "MESSAGE_POLL_UPDATED", dto)
        return dto
    }

    fun getMessageImage(
        messageId: Long,
        actorName: String,
    ): ChatImagePayload {
        val message =
            chatMessageRepository
                .findById(messageId)
                .orElseThrow { IllegalArgumentException("Message not found") }
        val collectiveCode = collectiveAccessService.requireCollectiveCodeByMemberName(actorName)
        require(message.collectiveCode == collectiveCode) { "Message not found" }
        val data = message.imageData ?: throw IllegalArgumentException("Message has no image")
        val bytes = Base64.getDecoder().decode(data)
        return ChatImagePayload(
            bytes = bytes,
            contentType = message.imageMimeType ?: "application/octet-stream",
            fileName = message.imageFileName,
        )
    }

    data class ChatImagePayload(
        val bytes: ByteArray,
        val contentType: String,
        val fileName: String?,
    )

    private fun notifyOtherMembers(
        collectiveCode: String,
        sender: String,
        text: String,
        type: String,
    ) {
        val others =
            memberRepository
                .findAllByCollectiveCode(collectiveCode)
                .filter { it.status == MemberStatus.ACTIVE && it.name != sender }
                .map { it.name }
        if (others.isEmpty()) return
        val preview = if (text.length > 60) text.take(60) + "..." else text
        notificationService.createParameterizedGroupNotification(
            userNames = others,
            type = type,
            params = mapOf("sender" to sender, "preview" to preview),
        )
    }

    private data class PollPayload(
        val question: String,
        val options: List<PollOptionPayload>,
    )

    private data class PollOptionPayload(
        val id: Int,
        val text: String,
        val users: List<String> = emptyList(),
    )

    private fun parseReactions(json: String): Map<String, Set<String>> {
        if (json.isBlank()) return emptyMap()
        return try {
            objectMapper.readValue<Map<String, Set<String>>>(json)
        } catch (_: Exception) {
            emptyMap()
        }
    }

    private fun parsePoll(json: String?): PollPayload? {
        val raw = json?.trim().orEmpty()
        if (raw.isBlank()) return null
        return try {
            objectMapper.readValue<PollPayload>(raw)
        } catch (_: Exception) {
            null
        }
    }

    private fun ChatMessage.reactionMap(): Map<String, Set<String>> = parseReactions(reactions)

    private fun ChatMessage.pollPayload(): PollPayload? = parsePoll(poll)

    private fun Map<String, Set<String>>.toJsonMap(): Map<String, List<String>> = mapValues { (_, value) -> value.toList().sorted() }

    private fun buildMessageDto(
        id: Long,
        sender: String,
        text: String,
        imageMimeType: String?,
        imageFileName: String?,
        replyToMessageId: Long?,
        timestamp: LocalDateTime,
        reactionsJson: String,
        pollJson: String?,
    ): MessageDto =
        MessageDto(
            id = id,
            sender = sender,
            text = text,
            imageMimeType = imageMimeType,
            imageFileName = imageFileName,
            replyToMessageId = replyToMessageId,
            timestamp = timestamp,
            reactions =
                parseReactions(reactionsJson)
                    .map { (emoji, users) -> ReactionDto(emoji, users.toList().sorted()) }
                    .sortedBy { it.emoji },
            poll =
                parsePoll(pollJson)?.let { payload ->
                    PollDto(
                        question = payload.question,
                        options =
                            payload.options
                                .sortedBy { it.id }
                                .map { PollOptionDto(id = it.id, text = it.text, users = it.users.sorted()) },
                    )
                },
        )

    private fun ChatMessage.toDto() =
        buildMessageDto(
            id = id,
            sender = sender,
            text = text,
            imageMimeType = imageMimeType,
            imageFileName = imageFileName,
            replyToMessageId = replyToMessageId,
            timestamp = timestamp,
            reactionsJson = reactions,
            pollJson = poll,
        )

    private fun ChatMessageListItem.toDto() =
        buildMessageDto(
            id = id,
            sender = sender,
            text = text,
            imageMimeType = imageMimeType,
            imageFileName = imageFileName,
            replyToMessageId = replyToMessageId,
            timestamp = timestamp,
            reactionsJson = reactions,
            pollJson = poll,
        )
}
