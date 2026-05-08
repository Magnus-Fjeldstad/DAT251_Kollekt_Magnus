-- chat_messages.existsByReplyToMessageId — currently a sequential scan.
create index if not exists idx_chat_messages_reply_to
    on chat_messages (reply_to_message_id)
    where reply_to_message_id is not null;

-- expenses.findAllByDeadlineDate — used by scheduled jobs (notifyUpcoming/Expired).
create index if not exists idx_expenses_deadline_date
    on expenses (deadline_date)
    where deadline_date is not null;

-- invitations had no indexes at all.
create index if not exists idx_invitations_email
    on invitations (lower(email));

create index if not exists idx_invitations_collective
    on invitations (collective_code);

-- prevents duplicate invites; fixes a NonUniqueResultException risk in
-- InvitationRepository.findByEmailAndCollectiveCode when two requests race.
create unique index if not exists uq_invitations_collective_email
    on invitations (collective_code, lower(email));

-- settlement_checkpoints.findTopByCollectiveCodeOrderByIdDesc has no
-- matching index. The existing (collective_code, settled_by, id desc)
-- index can't service queries without a settled_by predicate.
create index if not exists idx_settlement_checkpoints_collective_id
    on settlement_checkpoints (collective_code, id desc);

-- rooms.findAllByCollectiveId + the FK constraint both want this.
-- Postgres does not auto-index FK columns.
create index if not exists idx_rooms_collective_id
    on rooms (collective_id);

-- tasks "ordered by due_date, id" without a completed filter.
-- The existing (collective_code, completed, due_date, id) index can be
-- skip-scanned but the planner often won't; this is the direct match.
create index if not exists idx_tasks_collective_due_only
    on tasks (collective_code, due_date, id);

-- task_feedback.findAllByTaskIdIn benefits from a covering author index
-- only if author becomes a hot filter; skipping until proven necessary.

-- members.findByEmail — already covered by uq_members_email unique constraint.
-- members.findByName — already covered by uq_members_name.
-- members.findByNameAndCollectiveCode — uq_members_name + filter is fine
-- because name is globally unique today (see review item #9).

-- expenses tail-3 queries already covered by idx_expenses_collective_date.
-- pant entries tail queries already covered by idx_pant_entries_collective_date.
-- chat list queries already covered by idx_chat_messages_collective_timestamp.
-- notifications already covered by idx_notifications_user_timestamp +
-- idx_notifications_user_read_timestamp.
