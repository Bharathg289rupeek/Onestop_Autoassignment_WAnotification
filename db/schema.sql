-- ============================================================
-- Lead Assignment System — PostgreSQL Schema
-- ============================================================

-- Agents table (normalized with city/pincode identifiers)
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  branch_id VARCHAR(50) NOT NULL,
  agent_email VARCHAR(255) NOT NULL,
  agent_name VARCHAR(255) NOT NULL,
  agent_phone VARCHAR(20) NOT NULL,
  city VARCHAR(100),
  pincode VARCHAR(20),
  priority INTEGER NOT NULL DEFAULT 1,
  city_identifier VARCHAR(20) NOT NULL DEFAULT 'assign',     -- 'assign' or 'dont assign'
  pincode_identifier VARCHAR(20) NOT NULL DEFAULT 'assign',  -- 'assign' or 'dont assign'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lead source configuration (what condition to use per source)
CREATE TABLE IF NOT EXISTS lead_source_config (
  id SERIAL PRIMARY KEY,
  lead_source VARCHAR(100) NOT NULL UNIQUE,
  assign_by VARCHAR(20) NOT NULL DEFAULT 'branch_id',  -- 'branch_id', 'city', 'pincode'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
CREATE INDEX IF NOT EXISTS idx_agents_branch ON agents(branch_id, priority);
CREATE INDEX IF NOT EXISTS idx_agents_city ON agents(city, city_identifier);
CREATE INDEX IF NOT EXISTS idx_agents_pincode ON agents(pincode, pincode_identifier);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status, activity_checked, reassigned);
CREATE INDEX IF NOT EXISTS idx_leads_lead_id ON leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(lead_source);
CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at DESC);
