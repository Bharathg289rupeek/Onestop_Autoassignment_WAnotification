const { pool } = require('../db');

// ─── Agent Assignment Logic ─────────────────────────────────

async function getAssignMethod(leadSource) {
  if (!leadSource) return 'branch_id';
  const { rows } = await pool.query(
    'SELECT assign_by FROM lead_source_config WHERE lead_source = $1 AND is_active = true',
    [leadSource]
  );
  return rows[0]?.assign_by || 'branch_id';
}

async function findAgent(lead, mode) {
  let query, params;
  if (mode === 'city') {
    query = "SELECT * FROM agents WHERE LOWER(city) = LOWER($1) AND city_identifier = 'assign' AND is_active = true ORDER BY priority ASC LIMIT 1";
    params = [lead.city];
  } else if (mode === 'pincode') {
    query = "SELECT * FROM agents WHERE pincode = $1 AND pincode_identifier = 'assign' AND is_active = true ORDER BY priority ASC LIMIT 1";
    params = [lead.pincode];
  } else {
    query = 'SELECT * FROM agents WHERE branch_id = $1 AND is_active = true ORDER BY priority ASC LIMIT 1';
    params = [lead.branch_id];
  }
  const { rows } = await pool.query(query, params);
  return rows[0] || null;
}

// Find a specific agent by email (for forced assignment via assigned_agent field)
async function findAgentByEmail(email) {
  const { rows } = await pool.query(
    'SELECT * FROM agents WHERE LOWER(agent_email) = LOWER($1) AND is_active = true LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

async function findNextAgent(lead, mode, currentPriority) {
  let query, params;
  if (mode === 'city') {
    query = "SELECT * FROM agents WHERE LOWER(city) = LOWER($1) AND city_identifier = 'assign' AND is_active = true AND priority > $2 ORDER BY priority ASC LIMIT 1";
    params = [lead.city, currentPriority];
  } else if (mode === 'pincode') {
    query = "SELECT * FROM agents WHERE pincode = $1 AND pincode_identifier = 'assign' AND is_active = true AND priority > $2 ORDER BY priority ASC LIMIT 1";
    params = [lead.pincode, currentPriority];
  } else {
    query = 'SELECT * FROM agents WHERE branch_id = $1 AND is_active = true AND priority > $2 ORDER BY priority ASC LIMIT 1';
    params = [lead.branch_id, currentPriority];
  }
  const { rows } = await pool.query(query, params);
  return rows[0] || null;
}

// ─── Lead Operations ───────────────────────────────────────

async function insertLead(data) {
  const { rows } = await pool.query(
    "INSERT INTO leads (lead_id, phone, name, loan_amount, branch_id, city, pincode, loan_type, lead_source, assigned_agent_id, assigned_email, assigned_name, assigned_phone, assigned_priority, assigned_at, lead_status, onestop_lead_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),'Assigned',$15) RETURNING *",
    [data.lead_id, data.phone, data.name, data.loan_amount, data.branch_id, data.city, data.pincode, data.loan_type, data.lead_source, data.agent_id, data.agent_email, data.agent_name, data.agent_phone, data.agent_priority, data.onestop_lead_id]
  );
  return rows[0];
}

async function updateLeadWhatsapp(leadId, field, status) {
  const col = field === 'p1' ? 'whatsapp_p1_status' : 'whatsapp_p0_status';
  await pool.query('UPDATE leads SET ' + col + ' = $1, last_updated = NOW() WHERE lead_id = $2', [status, leadId]);
}

async function getLeadsPendingReassignment(delayMinutes) {
  const { rows } = await pool.query(
    "SELECT l.*, lsc.assign_by FROM leads l LEFT JOIN lead_source_config lsc ON lsc.lead_source = l.lead_source AND lsc.is_active = true WHERE l.lead_status = 'Assigned' AND l.activity_checked = false AND l.reassigned = false AND l.assigned_at < NOW() - INTERVAL '1 minute' * $1 ORDER BY l.assigned_at ASC",
    [delayMinutes]
  );
  return rows;
}

async function markLeadActive(leadId, callCount) {
  await pool.query(
    "UPDATE leads SET activity_checked = true, call_count = $1, lead_status = 'Active', last_updated = NOW() WHERE lead_id = $2",
    [callCount, leadId]
  );
}

async function reassignLead(leadId, agent) {
  await pool.query(
    "UPDATE leads SET reassigned = true, reassigned_agent_id = $1, reassigned_email = $2, reassigned_name = $3, reassigned_phone = $4, reassigned_at = NOW(), activity_checked = true, call_count = 0, lead_status = 'Reassigned', last_updated = NOW() WHERE lead_id = $5",
    [agent.id, agent.agent_email, agent.agent_name, agent.agent_phone, leadId]
  );
}

async function markLeadNoAgent(leadId) {
  await pool.query(
    "UPDATE leads SET activity_checked = true, lead_status = 'No Backup Agent', last_updated = NOW() WHERE lead_id = $1",
    [leadId]
  );
}

// ─── Log Operations ────────────────────────────────────────

async function appendLog(type, leadId, phone, details, status) {
  await pool.query(
    'INSERT INTO logs (type, lead_id, phone, details, status) VALUES ($1,$2,$3,$4,$5)',
    [type, leadId, phone, details, status]
  );
}

async function getRecentLogs(limit) {
  const { rows } = await pool.query('SELECT * FROM logs ORDER BY created_at DESC LIMIT $1', [limit || 200]);
  return rows;
}

// ─── Dashboard Stats ───────────────────────────────────────

const STATS_QUERY_TIMEOUT_MS = 10000;

async function getDashboardStats() {
  console.log('[getDashboardStats] Starting query at', new Date().toISOString());
  const startTime = Date.now();

  const queryPromise = pool.query('SELECT * FROM leads ORDER BY created_at DESC');
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('getDashboardStats timed out after ' + STATS_QUERY_TIMEOUT_MS + 'ms')), STATS_QUERY_TIMEOUT_MS)
  );

  const { rows: leads } = await Promise.race([queryPromise, timeoutPromise]);
  console.log('[getDashboardStats] Query returned', leads.length, 'rows in', (Date.now() - startTime) + 'ms');

  let total = 0, assigned = 0, reassignedCount = 0, active = 0, waSent = 0, waFailed = 0;
  for (const l of leads) {
    total++;
    if (l.lead_status === 'Assigned') assigned++;
    if (l.lead_status === 'Active') active++;
    if (l.reassigned === true) reassignedCount++;
    if (l.whatsapp_p0_status === 'Sent') waSent++;
    if (l.whatsapp_p0_status === 'Failed') waFailed++;
    if (l.whatsapp_p1_status === 'Sent') waSent++;
    if (l.whatsapp_p1_status === 'Failed') waFailed++;
  }

  return { total, assigned, reassigned: reassignedCount, active, whatsappSent: waSent, whatsappFailed: waFailed, leads };
}

// ─── Agent CRUD ────────────────────────────────────────────

async function getAllAgents() {
  const { rows } = await pool.query('SELECT * FROM agents ORDER BY branch_id, priority');
  return rows;
}

async function addAgent(data) {
  const { rows } = await pool.query(
    'INSERT INTO agents (branch_id, agent_email, agent_name, agent_phone, city, pincode, priority, city_identifier, pincode_identifier) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [data.branch_id, data.agent_email, data.agent_name, data.agent_phone, data.city || null, data.pincode || null, parseInt(data.priority) || 1, data.city_identifier || 'assign', data.pincode_identifier || 'assign']
  );
  return rows[0];
}

async function updateAgent(id, data) {
  const { rows } = await pool.query(
    'UPDATE agents SET branch_id=$1, agent_email=$2, agent_name=$3, agent_phone=$4, city=$5, pincode=$6, priority=$7, city_identifier=$8, pincode_identifier=$9, is_active=$10, updated_at=NOW() WHERE id=$11 RETURNING *',
    [data.branch_id, data.agent_email, data.agent_name, data.agent_phone, data.city || null, data.pincode || null, parseInt(data.priority) || 1, data.city_identifier || 'assign', data.pincode_identifier || 'assign', data.is_active !== false && data.is_active !== 'false', id]
  );
  return rows[0];
}

async function deleteAgent(id) {
  await pool.query('DELETE FROM agents WHERE id = $1', [id]);
}

async function bulkReplaceAgents(rows) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM agents');
    let inserted = 0;
    for (const r of rows) {
      await client.query(
        'INSERT INTO agents (branch_id, agent_email, agent_name, agent_phone, city, pincode, priority, city_identifier, pincode_identifier) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [r.branch_id, r.agent_email, r.agent_name, r.agent_phone, r.city || null, r.pincode || null, parseInt(r.priority) || 1, r.city_identifier || 'assign', r.pincode_identifier || 'assign']
      );
      inserted++;
    }
    await client.query('COMMIT');
    return { inserted, deleted: 'all' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Lead Source Config CRUD ───────────────────────────────

async function getAllSourceConfigs() {
  const { rows } = await pool.query('SELECT * FROM lead_source_config ORDER BY lead_source');
  return rows;
}

async function upsertSourceConfig(leadSource, assignBy) {
  const { rows } = await pool.query(
    "INSERT INTO lead_source_config (lead_source, assign_by) VALUES ($1, $2) ON CONFLICT (lead_source) DO UPDATE SET assign_by = $2, updated_at = NOW() RETURNING *",
    [leadSource, assignBy]
  );
  return rows[0];
}

async function deleteSourceConfig(id) {
  await pool.query('DELETE FROM lead_source_config WHERE id = $1', [id]);
}

// ─── WhatsApp Template Config CRUD ────────────────────────

async function getAllWhatsappTemplateConfigs() {
  const { rows } = await pool.query('SELECT * FROM whatsapp_template_config ORDER BY lead_source');
  return rows;
}

async function getWhatsappTemplateConfig(leadSource) {
  if (!leadSource) return null;
  const { rows } = await pool.query(
    'SELECT * FROM whatsapp_template_config WHERE lead_source = $1 AND is_active = true LIMIT 1',
    [leadSource]
  );
  return rows[0] || null;
}

async function upsertWhatsappTemplateConfig(data) {
  const { rows } = await pool.query(
    `INSERT INTO whatsapp_template_config
      (lead_source, template_id, reassign_template_id, param1, param2, param3, param4, param5)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (lead_source) DO UPDATE SET
       template_id = $2,
       reassign_template_id = $3,
       param1 = $4, param2 = $5, param3 = $6, param4 = $7, param5 = $8,
       updated_at = NOW()
     RETURNING *`,
    [
      data.lead_source,
      data.template_id,
      data.reassign_template_id || null,
      data.param1 || 'lead.name',
      data.param2 || 'lead.phone',
      data.param3 || 'lead.loan_amount',
      data.param4 || 'lead.loan_type',
      data.param5 || 'lead.cta_link',
    ]
  );
  return rows[0];
}

async function deleteWhatsappTemplateConfig(id) {
  await pool.query('DELETE FROM whatsapp_template_config WHERE id = $1', [id]);
}

// ─── System Config CRUD ────────────────────────────────────

async function getAllSystemConfigs() {
  const { rows } = await pool.query('SELECT * FROM system_config ORDER BY key');
  return rows;
}

async function getSystemConfig(key) {
  const { rows } = await pool.query('SELECT value FROM system_config WHERE key = $1', [key]);
  return rows[0]?.value || null;
}

async function setSystemConfig(key, value) {
  await pool.query(
    'INSERT INTO system_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
    [key, value]
  );
}

async function bulkSetSystemConfig(entries) {
  // entries: array of { key, value }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const e of entries) {
      await client.query(
        'INSERT INTO system_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
        [e.key, e.value]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getAssignMethod, findAgent, findAgentByEmail, findNextAgent,
  insertLead, updateLeadWhatsapp, getLeadsPendingReassignment,
  markLeadActive, reassignLead, markLeadNoAgent,
  appendLog, getRecentLogs, getDashboardStats,
  getAllAgents, addAgent, updateAgent, deleteAgent, bulkReplaceAgents,
  getAllSourceConfigs, upsertSourceConfig, deleteSourceConfig,
  getAllWhatsappTemplateConfigs, getWhatsappTemplateConfig, upsertWhatsappTemplateConfig, deleteWhatsappTemplateConfig,
  getAllSystemConfigs, getSystemConfig, setSystemConfig, bulkSetSystemConfig,
};
