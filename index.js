const express = require('express');
const cors = require('cors');
const multer = require('multer');
const config = require('./config');
const { initDB } = require('./db');
const db = require('./services/database');
const onestop = require('./services/onestop');
const whatsapp = require('./services/whatsapp');
const { generateLeadId, parseCSV } = require('./utils/helpers');
const { getDashboardHTML } = require('./dashboard');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Health ─────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ─── Receive Lead (webhook) ─────────────────────────────────
app.post('/api/receive-lead', async (req, res) => {
  try {
    const payload = req.body;
    const required = ['phone', 'name', 'loan_amount', 'branch_id', 'loan_type'];
    const missing = required.filter(f => !payload[f]);
    if (missing.length) return res.status(400).json({ code: 400, message: 'Missing: ' + missing.join(', ') });

    const leadId = payload.lead_id || generateLeadId();
    const phone = String(payload.phone).trim();

    console.log('[receiveLead] Processing ' + leadId + ' branch=' + payload.branch_id + ' source=' + payload.lead_source);

    const mode = await db.getAssignMethod(payload.lead_source);
    console.log('[receiveLead] Mode: ' + mode);

    const agent = await db.findAgent({ branch_id: payload.branch_id, city: payload.city, pincode: payload.pincode }, mode);

    if (!agent) {
      await db.appendLog('ERROR', leadId, phone, 'No agent found (mode=' + mode + ', branch=' + payload.branch_id + ', city=' + payload.city + ', pin=' + payload.pincode + ')', 'FAILED');
      return res.status(422).json({ code: 422, message: 'No agent configured (mode: ' + mode + ')' });
    }

    const lead = {
      lead_id: leadId, phone, name: payload.name, loan_amount: payload.loan_amount,
      loan_type: payload.loan_type, branch_id: payload.branch_id,
      city: payload.city, pincode: payload.pincode, lead_source: payload.lead_source,
    };
    const assignResult = await onestop.assignLead(lead, agent);

    await db.insertLead({
      lead_id: leadId, phone, name: payload.name, loan_amount: payload.loan_amount,
      branch_id: payload.branch_id, city: payload.city, pincode: payload.pincode,
      loan_type: payload.loan_type, lead_source: payload.lead_source,
      agent_id: agent.id, agent_email: agent.agent_email, agent_name: agent.agent_name,
      agent_phone: agent.agent_phone, agent_priority: agent.priority,
      onestop_lead_id: assignResult.data?.leadId || '',
    });

    await db.appendLog('ASSIGN', leadId, phone, 'Assigned to ' + agent.agent_name + ' (' + agent.agent_email + ') P' + agent.priority + ' mode:' + mode, 'SUCCESS');

    const waResult = await whatsapp.sendWhatsAppToAgent(agent.agent_phone, lead, agent, false);
    await db.updateLeadWhatsapp(leadId, 'p0', waResult.success ? 'Sent' : 'Failed');

    return res.json({
      code: 200, message: 'Lead processed',
      data: { lead_id: leadId, assigned_to: agent.agent_email, priority: agent.priority, mode },
    });
  } catch (err) {
    console.error('[receiveLead] Error:', err);
    try { await db.appendLog('ERROR', '', '', 'receiveLead: ' + err.message, 'FAILED'); } catch (_) {}
    return res.status(500).json({ code: 500, message: err.message });
  }
});

// ─── Check Reassignment (cron) ──────────────────────────────
app.post('/api/check-reassignment', async (req, res) => {
  try {
    const pending = await db.getLeadsPendingReassignment(config.REASSIGN_DELAY_MINUTES);
    const results = { checked: pending.length, active: 0, reassigned: 0, errors: 0 };

    for (const lead of pending) {
      try {
        const details = await onestop.getLeadDetails(lead.assigned_email, lead.phone);
        if (details.callCount > 0) {
          await db.markLeadActive(lead.lead_id, details.callCount);
          await db.appendLog('ACTIVITY_OK', lead.lead_id, lead.phone, details.callCount + ' call(s). No reassignment.', 'SUCCESS');
          results.active++;
          continue;
        }
        const mode = lead.assign_by || 'branch_id';
        const nextAgent = await db.findNextAgent(lead, mode, lead.assigned_priority);
        if (!nextAgent) {
          await db.markLeadNoAgent(lead.lead_id);
          await db.appendLog('ERROR', lead.lead_id, lead.phone, 'No backup agent (mode=' + mode + ')', 'FAILED');
          results.errors++;
          continue;
        }
        await onestop.updateAssignment(lead.onestop_lead_id || lead.lead_id, nextAgent);
        const waResult = await whatsapp.sendWhatsAppToAgent(nextAgent.agent_phone, lead, nextAgent, true);
        await db.reassignLead(lead.lead_id, nextAgent);
        await db.updateLeadWhatsapp(lead.lead_id, 'p1', waResult.success ? 'Sent' : 'Failed');
        await db.appendLog('REASSIGN', lead.lead_id, lead.phone, lead.assigned_name + ' -> ' + nextAgent.agent_name, 'SUCCESS');
        results.reassigned++;
      } catch (err) {
        await db.appendLog('ERROR', lead.lead_id, lead.phone, 'Reassign error: ' + err.message, 'FAILED');
        results.errors++;
      }
    }
    return res.json({ code: 200, message: 'Done', data: results });
  } catch (err) {
    console.error('[reassign] Fatal:', err);
    return res.status(500).json({ code: 500, message: err.message });
  }
});

// ─── Stats ──────────────────────────────────────────────────
app.get('/api/stats', async (_, res) => {
  try {
    return res.json({ code: 200, data: await db.getDashboardStats() });
  } catch (e) {
    console.error('[stats] Error fetching dashboard stats:');
    console.error('[stats] Message:', e.message);
    console.error('[stats] Stack:\n', e.stack);
    return res.status(500).json({ code: 500, message: e.message });
  }
});

// ─── Logs ───────────────────────────────────────────────────
app.get('/api/logs', async (_, res) => {
  try { return res.json({ code: 200, data: { logs: await db.getRecentLogs(200) } }); }
  catch (e) { console.error('[logs]', e); return res.status(500).json({ code: 500, message: e.message }); }
});

// ─── Agents CRUD ────────────────────────────────────────────
app.get('/api/agents', async (_, res) => {
  try { return res.json({ code: 200, data: await db.getAllAgents() }); }
  catch (e) { console.error('[agents]', e); return res.status(500).json({ code: 500, message: e.message }); }
});

app.post('/api/agents', async (req, res) => {
  try { return res.json({ code: 200, data: await db.addAgent(req.body) }); }
  catch (e) { console.error('[agents POST]', e); return res.status(500).json({ code: 500, message: e.message }); }
});

app.put('/api/agents/:id', async (req, res) => {
  try { return res.json({ code: 200, data: await db.updateAgent(req.params.id, req.body) }); }
  catch (e) { console.error('[agents PUT]', e); return res.status(500).json({ code: 500, message: e.message }); }
});

app.delete('/api/agents/:id', async (req, res) => {
  try { await db.deleteAgent(req.params.id); return res.json({ code: 200, message: 'Deleted' }); }
  catch (e) { console.error('[agents DEL]', e); return res.status(500).json({ code: 500, message: e.message }); }
});

// ─── Agents CSV Upload (full replace) ───────────────────────
app.post('/api/agents/upload-csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ code: 400, message: 'No file uploaded' });

    const csvText = req.file.buffer.toString('utf-8');
    const rows = parseCSV(csvText);

    if (rows.length === 0) return res.status(400).json({ code: 400, message: 'CSV is empty or has no data rows' });

    const first = rows[0];
    const requiredCols = ['branch_id', 'agent_email', 'agent_name', 'agent_phone', 'priority'];
    const missingCols = requiredCols.filter(c => !(c in first));
    if (missingCols.length > 0) {
      return res.status(400).json({
        code: 400,
        message: 'CSV missing columns: ' + missingCols.join(', '),
        hint: 'Required: branch_id, agent_email, agent_name, agent_phone, priority. Optional: city, pincode, city_identifier, pincode_identifier',
      });
    }

    const result = await db.bulkReplaceAgents(rows);
    await db.appendLog('AGENT_UPLOAD', '', '', 'CSV uploaded: ' + result.inserted + ' agents replaced', 'SUCCESS');

    return res.json({ code: 200, message: 'Replaced all agents with ' + result.inserted + ' from CSV', data: result });
  } catch (e) {
    console.error('[agents CSV]', e);
    return res.status(500).json({ code: 500, message: e.message });
  }
});

// ─── Download agents CSV ────────────────────────────────────
app.get('/api/agents/download-csv', async (_, res) => {
  try {
    const agents = await db.getAllAgents();
    const headers = ['branch_id','agent_email','agent_name','agent_phone','city','pincode','priority','city_identifier','pincode_identifier'];
    const lines = [headers.join(',')];
    for (const a of agents) {
      lines.push(headers.map(h => {
        const v = String(a[h] == null ? '' : a[h]);
        return v.includes(',') || v.includes('"') ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(','));
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=agents.csv');
    return res.send(lines.join('\n'));
  } catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

// ─── Source Config CRUD ─────────────────────────────────────
app.get('/api/source-config', async (_, res) => {
  try { return res.json({ code: 200, data: await db.getAllSourceConfigs() }); }
  catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

app.post('/api/source-config', async (req, res) => {
  try {
    const { lead_source, assign_by } = req.body;
    if (!lead_source || !['branch_id', 'city', 'pincode'].includes(assign_by)) {
      return res.status(400).json({ code: 400, message: 'Invalid lead_source or assign_by' });
    }
    return res.json({ code: 200, data: await db.upsertSourceConfig(lead_source, assign_by) });
  } catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

app.delete('/api/source-config/:id', async (req, res) => {
  try { await db.deleteSourceConfig(req.params.id); return res.json({ code: 200, message: 'Deleted' }); }
  catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

// ─── Dashboard HTML ─────────────────────────────────────────
app.get('/', (req, res) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const baseUrl = protocol + '://' + req.get('host');
  res.send(getDashboardHTML(baseUrl));
});

// ─── Start ──────────────────────────────────────────────────
async function start() {
  await initDB();
  app.listen(config.PORT, '0.0.0.0', () => {
    console.log('[Server] Running on port ' + config.PORT);
  });
}

start().catch(err => { console.error('Startup failed:', err); process.exit(1); });
