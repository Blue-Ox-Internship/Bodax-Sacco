-- Multi-SACCO Migration
CREATE TABLE IF NOT EXISTS saccos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(160) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO saccos (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Default Bodax SACCO') ON CONFLICT DO NOTHING;

ALTER TABLE roles ADD COLUMN IF NOT EXISTS sacco_id UUID REFERENCES saccos(id) ON DELETE CASCADE;
UPDATE roles SET sacco_id = '00000000-0000-0000-0000-000000000001' WHERE sacco_id IS NULL;
ALTER TABLE roles ALTER COLUMN sacco_id SET NOT NULL;
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_code_key;
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_sacco_id_code_key;
ALTER TABLE roles ADD CONSTRAINT roles_sacco_id_code_key UNIQUE (sacco_id, code);

ALTER TABLE users ADD COLUMN IF NOT EXISTS sacco_id UUID REFERENCES saccos(id) ON DELETE CASCADE;
UPDATE users SET sacco_id = '00000000-0000-0000-0000-000000000001' WHERE sacco_id IS NULL;
ALTER TABLE users ALTER COLUMN sacco_id SET NOT NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_sacco_id_email_key;
ALTER TABLE users ADD CONSTRAINT users_sacco_id_email_key UNIQUE (sacco_id, email);

ALTER TABLE members ADD COLUMN IF NOT EXISTS sacco_id UUID REFERENCES saccos(id) ON DELETE CASCADE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS number_plate VARCHAR(30);
UPDATE members SET sacco_id = '00000000-0000-0000-0000-000000000001' WHERE sacco_id IS NULL;
ALTER TABLE members ALTER COLUMN sacco_id SET NOT NULL;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_member_number_key;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_phone_number_key;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_user_id_key;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_sacco_id_member_number_key;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_sacco_id_phone_number_key;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_sacco_id_number_plate_key;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_sacco_id_user_id_key;
ALTER TABLE members ADD CONSTRAINT members_sacco_id_member_number_key UNIQUE (sacco_id, member_number);
ALTER TABLE members ADD CONSTRAINT members_sacco_id_phone_number_key UNIQUE (sacco_id, phone_number);
ALTER TABLE members ADD CONSTRAINT members_sacco_id_number_plate_key UNIQUE (sacco_id, number_plate);
ALTER TABLE members ADD CONSTRAINT members_sacco_id_user_id_key UNIQUE (sacco_id, user_id);

ALTER TABLE savings_transactions ADD COLUMN IF NOT EXISTS sacco_id UUID REFERENCES saccos(id) ON DELETE CASCADE;
UPDATE savings_transactions SET sacco_id = '00000000-0000-0000-0000-000000000001' WHERE sacco_id IS NULL;
ALTER TABLE savings_transactions ALTER COLUMN sacco_id SET NOT NULL;

ALTER TABLE loans ADD COLUMN IF NOT EXISTS sacco_id UUID REFERENCES saccos(id) ON DELETE CASCADE;
UPDATE loans SET sacco_id = '00000000-0000-0000-0000-000000000001' WHERE sacco_id IS NULL;
ALTER TABLE loans ALTER COLUMN sacco_id SET NOT NULL;

ALTER TABLE loan_repayments ADD COLUMN IF NOT EXISTS sacco_id UUID REFERENCES saccos(id) ON DELETE CASCADE;
UPDATE loan_repayments SET sacco_id = '00000000-0000-0000-0000-000000000001' WHERE sacco_id IS NULL;
ALTER TABLE loan_repayments ALTER COLUMN sacco_id SET NOT NULL;

ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS sacco_id UUID REFERENCES saccos(id) ON DELETE CASCADE;
UPDATE loan_requests SET sacco_id = '00000000-0000-0000-0000-000000000001' WHERE sacco_id IS NULL;
ALTER TABLE loan_requests ALTER COLUMN sacco_id SET NOT NULL;

ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS sacco_id UUID REFERENCES saccos(id) ON DELETE CASCADE;
UPDATE withdrawal_requests SET sacco_id = '00000000-0000-0000-0000-000000000001' WHERE sacco_id IS NULL;
ALTER TABLE withdrawal_requests ALTER COLUMN sacco_id SET NOT NULL;

ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS sacco_id UUID REFERENCES saccos(id) ON DELETE CASCADE;
UPDATE withdrawals SET sacco_id = '00000000-0000-0000-0000-000000000001' WHERE sacco_id IS NULL;
ALTER TABLE withdrawals ALTER COLUMN sacco_id SET NOT NULL;

ALTER TABLE reports ADD COLUMN IF NOT EXISTS sacco_id UUID REFERENCES saccos(id) ON DELETE CASCADE;
UPDATE reports SET sacco_id = '00000000-0000-0000-0000-000000000001' WHERE sacco_id IS NULL;
ALTER TABLE reports ALTER COLUMN sacco_id SET NOT NULL;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deposit_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  transaction_id VARCHAR(80),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);