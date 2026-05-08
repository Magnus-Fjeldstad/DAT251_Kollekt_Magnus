package com.kollekt.domain

import jakarta.persistence.CollectionTable
import jakarta.persistence.Column
import jakarta.persistence.ElementCollection
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.OneToMany
import jakarta.persistence.Table
import org.hibernate.annotations.BatchSize
import org.hibernate.annotations.Fetch
import org.hibernate.annotations.FetchMode

@Entity
@Table(name = "collectives")
@BatchSize(size = 50)
data class Collective(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) val id: Long = 0,
    @Column(nullable = false) val name: String,
    @Column(nullable = false, unique = true) val joinCode: String,
    @Column(nullable = false) val ownerMemberId: Long,
    @Column(nullable = true) val monthlyPrize: String? = null,
    @Column(nullable = true) val pantGoal: Int? = null,
    @OneToMany(mappedBy = "collective", fetch = FetchType.LAZY, cascade = [jakarta.persistence.CascadeType.ALL], orphanRemoval = true)
    @BatchSize(size = 50)
    val rooms: List<Room> = emptyList(),
    @ElementCollection(fetch = FetchType.LAZY)
    @Fetch(FetchMode.SUBSELECT)
    @CollectionTable(name = "collective_enabled_achievements", joinColumns = [JoinColumn(name = "collective_id")])
    @Column(name = "achievement_key")
    val enabledAchievementKeys: Set<String> = emptySet(),
)
