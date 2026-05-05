create index if not exists idx_tasks_collective_due
    on tasks (collective_code, completed, due_date, id);

create index if not exists idx_tasks_collective_assignee_completed
    on tasks (collective_code, assignee, completed);

create index if not exists idx_tasks_collective_completed_at
    on tasks (collective_code, completed_at);

create index if not exists idx_task_feedback_task_id
    on task_feedback (task_id);

create index if not exists idx_shopping_items_collective_completed
    on shopping_items (collective_code, completed, id);

create index if not exists idx_events_collective_date
    on events (collective_code, date, time);

create index if not exists idx_expenses_collective_date
    on expenses (collective_code, date desc, id desc);

create index if not exists idx_expense_participants_expense_id
    on expense_participants (expense_id);

create index if not exists idx_pant_entries_collective_date
    on pant_entries (collective_code, date desc, id desc);

create index if not exists idx_chat_messages_collective_timestamp
    on chat_messages (collective_code, timestamp);

create index if not exists idx_notifications_user_timestamp
    on notifications (user_name, timestamp desc);

create index if not exists idx_notifications_user_read_timestamp
    on notifications (user_name, read, timestamp desc);

create index if not exists idx_members_collective
    on members (collective_code);

create index if not exists idx_personal_settlements_collective_members
    on personal_settlements (collective_code, paid_by, paid_to);

create index if not exists idx_settlement_checkpoints_collective_member
    on settlement_checkpoints (collective_code, settled_by, id desc);
