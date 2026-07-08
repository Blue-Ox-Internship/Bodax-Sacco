CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS saccos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(160) NOT NULL,
  code VARCHAR(30) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sacco_id, code)
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id),
  email VARCHAR(160) NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sacco_id, email)
);

CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  member_number VARCHAR(40) NOT NULL,
  number_plate VARCHAR(30),
  full_name VARCHAR(160) NOT NULL,
  phone_number VARCHAR(30) NOT NULL,
  national_id VARCHAR(50),
  stage VARCHAR(100),
  photo TEXT,
  next_of_kin VARCHAR(100),
  next_of_kin_phone VARCHAR(30),
  registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sacco_id, member_number),
  UNIQUE(sacco_id, phone_number),
  UNIQUE(sacco_id, number_plate),
  UNIQUE(sacco_id, user_id)
);

CREATE TABLE IF NOT EXISTS savings_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  issued_by UUID NOT NULL REFERENCES users(id),
  principal NUMERIC(14, 2) NOT NULL CHECK (principal > 0),
  interest_rate NUMERIC(6, 3) NOT NULL DEFAULT 10 CHECK (interest_rate >= 0),
  interest_amount NUMERIC(14, 2) NOT NULL,
  total_payable NUMERIC(14, 2) NOT NULL,
  installment_count INTEGER NOT NULL DEFAULT 4 CHECK (installment_count > 0),
  installment_amount NUMERIC(14, 2) NOT NULL,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_repayments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  requested_amount NUMERIC(14, 2) NOT NULL CHECK (requested_amount > 0),
  purpose TEXT,
  installment_count INTEGER NOT NULL DEFAULT 4 CHECK (installment_count > 0),
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  eligibility_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (eligibility_status IN ('eligible', 'ineligible')),
  eligibility_reason TEXT,
  max_eligible_amount NUMERIC(14, 2),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
  request_id UUID UNIQUE REFERENCES withdrawal_requests(id) ON DELETE SET NULL,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  withdrawal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES users(id),
  report_type VARCHAR(80) NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_members_sacco_member_number ON members(sacco_id, member_number);
CREATE INDEX IF NOT EXISTS idx_members_sacco_phone_number ON members(sacco_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_members_sacco_user_id ON members(sacco_id, user_id);
CREATE INDEX IF NOT EXISTS idx_savings_sacco_transaction_date ON savings_transactions(sacco_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_savings_sacco_member_date ON savings_transactions(sacco_id, member_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_savings_sacco_confirmed ON savings_transactions(sacco_id, confirmed, transaction_date);
CREATE INDEX IF NOT EXISTS idx_loans_sacco_status ON loans(sacco_id, status);
CREATE INDEX IF NOT EXISTS idx_loans_sacco_member_status ON loans(sacco_id, member_id, status);
CREATE INDEX IF NOT EXISTS idx_loans_sacco_due_date ON loans(sacco_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_repayments_sacco_payment_date ON loan_repayments(sacco_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_repayments_sacco_loan_id ON loan_repayments(sacco_id, loan_id);
CREATE INDEX IF NOT EXISTS idx_repayments_sacco_member_id ON loan_repayments(sacco_id, member_id);
CREATE INDEX IF NOT EXISTS idx_loan_requests_sacco_status ON loan_requests(sacco_id, status);
CREATE INDEX IF NOT EXISTS idx_loan_requests_sacco_member ON loan_requests(sacco_id, member_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_sacco_status ON withdrawal_requests(sacco_id, status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_sacco_member_id ON withdrawals(sacco_id, member_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sacco_user_read ON notifications(sacco_id, user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_deposit_notifs_sacco_status ON deposit_notifications(sacco_id, status);
CREATE INDEX IF NOT EXISTS idx_password_resets_sacco_status ON password_reset_requests(sacco_id, status);

-- Seed Default SACCO
INSERT INTO saccos (id, name, code)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Bodax SACCO', 'BODAX')
ON CONFLICT (id) DO NOTHING;

-- Seed Data (Default SACCO)
INSERT INTO roles (sacco_id, code, name)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'MEMBER', 'Member'), 
  ('00000000-0000-0000-0000-000000000001', 'TREASURER', 'Treasurer'), 
  ('00000000-0000-0000-0000-000000000001', 'CHAIRMAN', 'Chairman')
ON CONFLICT (sacco_id, code) DO NOTHING;

INSERT INTO users (sacco_id, role_id, email, password_hash)
SELECT '00000000-0000-0000-0000-000000000001', id, 'treasurer@bodax.test', crypt('password123', gen_salt('bf')) 
FROM roles WHERE code = 'TREASURER' AND sacco_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (sacco_id, email) DO NOTHING;

INSERT INTO users (sacco_id, role_id, email, password_hash)
SELECT '00000000-0000-0000-0000-000000000001', id, 'chairman@bodax.test', crypt('password123', gen_salt('bf')) 
FROM roles WHERE code = 'CHAIRMAN' AND sacco_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (sacco_id, email) DO NOTHING;

INSERT INTO users (sacco_id, role_id, email, password_hash)
SELECT '00000000-0000-0000-0000-000000000001', id, 'member@bodax.test', crypt('password123', gen_salt('bf')) 
FROM roles WHERE code = 'MEMBER' AND sacco_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (sacco_id, email) DO NOTHING;

INSERT INTO members (sacco_id, user_id, member_number, full_name, phone_number, national_id, stage, next_of_kin, next_of_kin_phone)
SELECT '00000000-0000-0000-0000-000000000001', id, 'MBR-0001', 'John Kato', '+256700000001', 'CM000001', 'Mbarara Central Stage', 'Sarah Kato', '+256700000002'
FROM users WHERE email = 'member@bodax.test' AND sacco_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (sacco_id, member_number) DO NOTHING;