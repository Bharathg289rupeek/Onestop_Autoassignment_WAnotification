-- ============================================================
-- Lead Assignment System — PostgreSQL Schema
-- ============================================================

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  branch_id VARCHAR(50) NOT NULL,
  agent_email VARCHAR(255) NOT NULL,
  agent_name VARCHAR(255) NOT NULL,
  agent_phone VARCHAR(20) NOT NULL,
  city VARCHAR(100),
  pincode VARCHAR(20),
  priority INTEGER NOT NULL DEFAULT 1,
  city_identifier VARCHAR(20) NOT NULL DEFAULT 'assign',
  pincode_identifier VARCHAR(20) NOT NULL DEFAULT 'assign',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lead source configuration
CREATE TABLE IF NOT EXISTS lead_source_config (
  id SERIAL PRIMARY KEY,
  lead_source VARCHAR(100) NOT NULL UNIQUE,
  assign_by VARCHAR(20) NOT NULL DEFAULT 'branch_id',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-source WhatsApp template configuration
-- Supported param variables:
--   lead.name | lead.phone | lead.loan_amount | lead.loan_type | lead.cta_link
--   lead.city | lead.branch_id | lead.pincode
--   agent.name | agent.email | agent.phone
-- Any other string is passed as a literal value.
CREATE TABLE IF NOT EXISTS whatsapp_template_config (
  id SERIAL PRIMARY KEY,
  lead_source VARCHAR(100) NOT NULL UNIQUE,
  template_id VARCHAR(200) NOT NULL,
  reassign_template_id VARCHAR(200),
  param1 VARCHAR(100) DEFAULT 'lead.name',
  param2 VARCHAR(100) DEFAULT 'lead.phone',
  param3 VARCHAR(100) DEFAULT 'lead.loan_amount',
  param4 VARCHAR(100) DEFAULT 'lead.loan_type',
  param5 VARCHAR(100) DEFAULT 'lead.cta_link',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System settings (editable via dashboard)
CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  label VARCHAR(200),
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default system settings (no-op if already exist)
INSERT INTO system_config (key, value, label, description) VALUES
  ('REASSIGN_DELAY_MINUTES', '10',   'Reassignment Delay (minutes)', 'Minutes to wait before reassigning a lead with no call activity'),
  ('DEFAULT_CITY',           'bangalore', 'Default City',            'Fallback city when not provided in the lead payload'),
  ('LEAD_CTA_BASE_URL',      'https://leadfusion.rupeek.com', 'Lead CTA Base URL', 'Base URL for lead action links sent in WhatsApp messages')
ON CONFLICT (key) DO NOTHING;

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  lead_id VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  loan_amount NUMERIC(15,2),
  branch_id VARCHAR(50),
  city VARCHAR(100),
  pincode VARCHAR(20),
  loan_type VARCHAR(20),
  lead_source VARCHAR(100),

  -- Assignment
  assigned_agent_id INTEGER REFERENCES agents(id) ON UPDATE CASCADE ON DELETE SET NULL,
  assigned_email VARCHAR(255),
  assigned_name VARCHAR(255),
  assigned_phone VARCHAR(20),
  assigned_priority INTEGER,
  assigned_at TIMESTAMPTZ,

  -- Reassignment
  reassigned BOOLEAN NOT NULL DEFAULT false,
  reassigned_agent_id INTEGER REFERENCES agents(id) ON UPDATE CASCADE ON DELETE SET NULL,
  reassigned_email VARCHAR(255),
  reassigned_name VARCHAR(255),
  reassigned_phone VARCHAR(20),
  reassigned_at TIMESTAMPTZ,

  -- Status
  whatsapp_p0_status VARCHAR(20) DEFAULT 'Pending',
  whatsapp_p1_status VARCHAR(20),
  call_count INTEGER NOT NULL DEFAULT 0,
  activity_checked BOOLEAN NOT NULL DEFAULT false,
  lead_status VARCHAR(50) NOT NULL DEFAULT 'Assigned',
  onestop_lead_id VARCHAR(100),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  lead_id VARCHAR(100),
  phone VARCHAR(20),
  details TEXT,
  status VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_branch    ON agents(branch_id, priority);
CREATE INDEX IF NOT EXISTS idx_agents_city      ON agents(city, city_identifier);
CREATE INDEX IF NOT EXISTS idx_agents_pincode   ON agents(pincode, pincode_identifier);
CREATE INDEX IF NOT EXISTS idx_agents_email     ON agents(agent_email);
CREATE INDEX IF NOT EXISTS idx_leads_status     ON leads(lead_status, activity_checked, reassigned);
CREATE INDEX IF NOT EXISTS idx_leads_lead_id    ON leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_source     ON leads(lead_source);
CREATE INDEX IF NOT EXISTS idx_logs_created     ON logs(created_at DESC);
