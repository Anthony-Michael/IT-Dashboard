# DB Migration Notes

Use these SQL statements if your local database was created before the latest `db/schema.sql` updates.

## 1) Ensure `tickets.smartsheet_row_id` is unique

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_smartsheet_row_id ON tickets (smartsheet_row_id);
```

## 2) Ensure ticket list/filter indexes exist

```sql
CREATE INDEX IF NOT EXISTS idx_tickets_approval_status ON tickets (approval_status);
CREATE INDEX IF NOT EXISTS idx_tickets_queue ON tickets (queue);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_status ON tickets (ticket_status);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_user_id ON tickets (assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_category_id ON tickets (category_id);
```

## 3) Add category queue support (if missing)

```sql
ALTER TABLE ticket_categories
ADD COLUMN IF NOT EXISTS queue queue;

UPDATE ticket_categories
SET queue = 'it'
WHERE queue IS NULL;

ALTER TABLE ticket_categories
ALTER COLUMN queue SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ticket_categories_name_queue_key'
  ) THEN
    ALTER TABLE ticket_categories
    ADD CONSTRAINT ticket_categories_name_queue_key UNIQUE (name, queue);
  END IF;
END$$;
```
