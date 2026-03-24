CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE approval_status AS ENUM ('pending_approval', 'approved', 'denied');
CREATE TYPE ticket_status AS ENUM ('new', 'triage', 'in_progress', 'waiting_on_requester', 'resolved', 'closed');
CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE queue AS ENUM ('it', 'operations');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ticket_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  queue queue NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, queue)
);

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smartsheet_row_id TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  queue queue NOT NULL,
  approval_status approval_status NOT NULL DEFAULT 'pending_approval',
  ticket_status ticket_status NOT NULL DEFAULT 'new',
  priority priority NOT NULL DEFAULT 'medium',
  assignee_user_id UUID REFERENCES users(id),
  category_id UUID REFERENCES ticket_categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL,
  body TEXT NOT NULL,
  sender_user_id UUID REFERENCES users(id),
  from_email TEXT,
  to_email TEXT,
  email_subject TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ticket_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE integration_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id),
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  external_record_id TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_approval_status ON tickets (approval_status);
CREATE UNIQUE INDEX idx_tickets_smartsheet_row_id ON tickets (smartsheet_row_id);
CREATE INDEX idx_tickets_queue ON tickets (queue);
CREATE INDEX idx_tickets_ticket_status ON tickets (ticket_status);
CREATE INDEX idx_tickets_requester_email ON tickets (requester_email);
CREATE INDEX idx_tickets_assignee_user_id ON tickets (assignee_user_id);
CREATE INDEX idx_tickets_category_id ON tickets (category_id);
CREATE INDEX idx_tickets_priority ON tickets (priority);
CREATE INDEX idx_tickets_list_filter ON tickets (approval_status, queue, ticket_status, priority, created_at DESC);

CREATE INDEX idx_ticket_messages_ticket_id_created_at ON ticket_messages (ticket_id, created_at DESC);
CREATE INDEX idx_ticket_audit_log_ticket_id_created_at ON ticket_audit_log (ticket_id, created_at DESC);
CREATE INDEX idx_integration_sync_log_ticket_id_created_at ON integration_sync_log (ticket_id, created_at DESC);
