package com.kollekt.repository

import com.kollekt.domain.CalendarEvent
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate

interface EventRepository : JpaRepository<CalendarEvent, Long> {
    fun findAllByCollectiveCode(collectiveCode: String): List<CalendarEvent>

    fun findAllByCollectiveCodeOrderByDateAscTimeAsc(collectiveCode: String): List<CalendarEvent>

    fun findTop3ByCollectiveCodeAndDateGreaterThanEqualOrderByDateAscTimeAsc(
        collectiveCode: String,
        date: LocalDate,
    ): List<CalendarEvent>
}
