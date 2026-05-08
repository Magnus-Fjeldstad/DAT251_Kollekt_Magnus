package com.kollekt.repository

import com.kollekt.domain.ChatMessage
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

data class ChatMessageListItem(
    val id: Long,
    val sender: String,
    val text: String,
    val imageMimeType: String?,
    val imageFileName: String?,
    val replyToMessageId: Long?,
    val timestamp: LocalDateTime,
    val reactions: String,
    val poll: String?,
)

interface ChatMessageRepository : JpaRepository<ChatMessage, Long> {
    fun findAllByCollectiveCode(collectiveCode: String): List<ChatMessage>

    @Query(
        """
        SELECT new com.kollekt.repository.ChatMessageListItem(
            m.id, m.sender, m.text, m.imageMimeType, m.imageFileName,
            m.replyToMessageId, m.timestamp, m.reactions, m.poll
        )
        FROM ChatMessage m
        WHERE m.collectiveCode = :collectiveCode
        ORDER BY m.timestamp ASC
        """,
    )
    fun findListItemsByCollectiveCode(
        @Param("collectiveCode") collectiveCode: String,
    ): List<ChatMessageListItem>

    fun existsByReplyToMessageId(replyToMessageId: Long): Boolean
}
