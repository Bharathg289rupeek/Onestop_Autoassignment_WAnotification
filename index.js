const express = require('express');
const cors = require('cors');
const multer = require('multer');
const config = require('./config');
const { initDB } = require('./db');
const db = require('./services/database');
const onestop = require('./services/onestop');
const whatsapp = require('./services/whatsapp');
const { generateLeadId, buildExternalId, parseCSV } = require('./utils/helpers');
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
    // branch_id is no longer required — assignment is driven by pincode only.
    const required = ['phone', 'name', 'loan_amount', 'loan_type'];
    const missing = required.filter(f => !payload[f]);
    if (missing.length) return res.status(400).json({ code: 400, message: 'Missing: ' + missing.join(', ') });

    const leadId = payload.lead_id || generateLeadId();
    const phone = String(payload.phone).trim();
    const pincode = db.normalizePincode(payload.pincode);
    // External-facing ID (sent to WhatsApp CTA link + OneStop leadID) instead
    // of the internal lead_id: lead_source_assigned_source_date_phone.
    const externalId = buildExternalId(payload.lead_source, payload.assigned_source, phone);

    console.log('[receiveLead] Processing ' + leadId + ' pin=' + (pincode || 'NONE') + ' source=' + payload.lead_source);

    // Common fields for recording the lead whether or not it gets assigned.
    const baseLead = {
      lead_id: leadId, phone, name: payload.name, loan_amount: payload.loan_amount,
      branch_id: payload.branch_id || null, city: payload.city || null, pincode: pincode || null,
      loan_type: payload.loan_type, lead_source: payload.lead_source, external_id: externalId,
      assigned_source: payload.assigned_source || null,
    };

    // Per lead_source + assigned_source (affiliate/client) config, set from
    // the Source Config tab: whether to send WhatsApp and what priority
    // score to send OneStop. RULE 0: no matching row at all (not even the
    // lead_source wildcard) -> do not assign until one is configured.
    const sourceConfig = await db.getSourceConfig(baseLead.lead_source, baseLead.assigned_source);
    if (!sourceConfig) {
      await db.insertLead({ ...baseLead, lead_status: 'Unassigned - No Source Config' });
      await db.appendLog('NOT_ASSIGNED', leadId, phone,
        'No Source Config for lead_source=' + baseLead.lead_source + ' assigned_source=' + (baseLead.assigned_source || '-') + ' — not assigned', 'FAILED');
      return res.status(200).json({
        code: 200, message: 'Lead recorded but not assigned — no Source Config for this lead_source/affiliate',
        data: { lead_id: leadId, assigned: false, reason: 'NO_SOURCE_CONFIG' },
      });
    }
    const priorityScore = Number(sourceConfig.priority_score);
    const sendWhatsapp = sourceConfig.send_whatsapp !== false;

    // ── Agent resolution ──────────────────────────────────────
    // `assigned_agent` (email) in the payload still force-assigns, bypassing
    // the pincode rotation. Everything else goes through pincode round robin.
    let agent = null;
    let mode = 'pincode_round_robin';

    if (payload.assigned_agent) {
      mode = 'forced';
      agent = await db.findAgentByEmail(payload.assigned_agent);
      if (!agent) {
        await db.appendLog('ERROR', leadId, phone, 'assigned_agent not found: ' + payload.assigned_agent, 'FAILED');
        return res.status(422).json({ code: 422, message: 'assigned_agent not found: ' + payload.assigned_agent });
      }
      console.log('[receiveLead] Forced agent: ' + agent.agent_email);
    } else {
      // RULE 1: no pincode on the lead -> do not assign.
      if (!pincode) {
        await db.insertLead({ ...baseLead, lead_status: 'Unassigned - No Pincode' });
        await db.appendLog('NOT_ASSIGNED', leadId, phone, 'Lead has no pincode — not assigned', 'FAILED');
        return res.status(200).json({
          code: 200, message: 'Lead recorded but not assigned — no pincode',
          data: { lead_id: leadId, assigned: false, reason: 'NO_PINCODE' },
        });
      }

      // RULE 2 + 3: assignable agent in that pincode, picked round robin.
      agent = await db.claimAgentByPincode(pincode, null);
      if (!agent) {
        const n = await db.countAssignableAgents(pincode);
        const reason = n === 0 ? 'NO_AGENT_IN_PINCODE' : 'ALL_AGENTS_BUSY';
        await db.insertLead({ ...baseLead, lead_status: 'Unassigned - No Agent In Pincode' });
        await db.appendLog('NOT_ASSIGNED', leadId, phone,
          'No assignable agent for pincode ' + pincode + ' (' + reason + ')', 'FAILED');
        return res.status(200).json({
          code: 200, message: 'Lead recorded but not assigned — no agent in pincode ' + pincode,
          data: { lead_id: leadId, assigned: false, reason, pincode },
        });
      }
      console.log('[receiveLead] Round robin picked ' + agent.agent_email + ' for pin ' + pincode);
    }

    const assignResult = await onestop.assignLead(baseLead, agent, priorityScore);

    await db.insertLead({
      ...baseLead,
      agent_id: agent.id, agent_email: agent.agent_email, agent_name: agent.agent_name,
      agent_phone: agent.agent_phone,
      onestop_lead_id: assignResult.data?.leadId || '',
    });

    await db.appendLog('ASSIGN', leadId, phone,
      'Assigned to ' + agent.agent_name + ' (' + agent.agent_email + ') pin:' + (pincode || '-') +
      ' rotation#' + agent.assign_count + ' mode:' + mode, 'SUCCESS');

    // send_whatsapp = false on the matching source config skips the message entirely.
    let waResult = { success: false, message: 'Skipped by source config' };
    if (sendWhatsapp) {
      // Change: pass payload.template_id as override (may be undefined/null — that's fine)
      waResult = await whatsapp.sendWhatsAppToAgent(agent.agent_phone, baseLead, agent, false, payload.template_id || null);
    }
    await db.updateLeadWhatsapp(leadId, 'p0', !sendWhatsapp ? 'Skipped' : (waResult.success ? 'Sent' : 'Failed'));

    return res.json({
      code: 200, message: 'Lead processed',
      data: { lead_id: leadId, assigned: true, assigned_to: agent.agent_email, pincode: pincode || null, mode },
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
    // Read delay from DB (editable via dashboard), fall back to config
    const delayStr = await db.getSystemConfig('REASSIGN_DELAY_MINUTES');
    const delayMinutes = delayStr ? parseInt(delayStr, 10) : config.REASSIGN_DELAY_MINUTES;

    const pending = await db.getLeadsPendingReassignment(delayMinutes);
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
        // Reassignment stays inside the same pincode: hand the lead to the
        // next agent in that pincode's rotation, skipping the current one.
        const nextAgent = await db.findNextAgent(lead, lead.assigned_agent_id);
        if (!nextAgent) {
          await db.markLeadNoAgent(lead.lead_id);
          await db.appendLog('ERROR', lead.lead_id, lead.phone,
            'No backup agent in pincode ' + (lead.pincode || '-'), 'FAILED');
          results.errors++;
          continue;
        }
        await onestop.updateAssignment(lead.onestop_lead_id || lead.external_id || lead.lead_id, nextAgent);
        const reassignSourceConfig = await db.getSourceConfig(lead.lead_source, lead.assigned_source);
        const reassignSendWhatsapp = reassignSourceConfig ? reassignSourceConfig.send_whatsapp !== false : true;
        let waResult = { success: false, message: 'Skipped by source config' };
        if (reassignSendWhatsapp) {
          waResult = await whatsapp.sendWhatsAppToAgent(nextAgent.agent_phone, lead, nextAgent, true);
        }
        await db.reassignLead(lead.lead_id, nextAgent);
        await db.updateLeadWhatsapp(lead.lead_id, 'p1', !reassignSendWhatsapp ? 'Skipped' : (waResult.success ? 'Sent' : 'Failed'));
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

// Shared by the single and bulk manual-assign routes below. Bypasses the
// Source Config lookup — the operator picks lead_source, assigned_source
// (affiliate/client), priority, and whether to send WhatsApp directly,
// rather than needing a matching config row first.
async function manuallyAssignLead(lead, { lead_source, assigned_source, priorityScore, sendWhatsapp }) {
  if (lead.assigned_agent_id) return { ok: false, status: 400, message: 'Lead is already assigned' };
  if (!lead.pincode) return { ok: false, status: 400, message: 'Lead has no pincode — cannot round-robin assign' };
  if (!lead_source) return { ok: false, status: 400, message: 'lead_source is required' };

  const agent = await db.claimAgentByPincode(lead.pincode, null);
  if (!agent) {
    const n = await db.countAssignableAgents(lead.pincode);
    const reason = n === 0 ? 'NO_AGENT_IN_PINCODE' : 'ALL_AGENTS_BUSY';
    return { ok: false, status: 409, message: 'No assignable agent in pincode ' + lead.pincode + ' (' + reason + ')' };
  }

  const externalId = lead.external_id || buildExternalId(lead_source, assigned_source, lead.phone);
  const leadForAssign = { ...lead, lead_source, assigned_source: assigned_source || null, external_id: externalId };

  const assignResult = await onestop.assignLead(leadForAssign, agent, priorityScore);

  await db.manualAssignLead(lead.lead_id, agent, {
    lead_source, assigned_source: assigned_source || null, external_id: externalId,
    onestop_lead_id: assignResult.data?.leadId || '',
  });

  await db.appendLog('ASSIGN', lead.lead_id, lead.phone,
    'Manually assigned to ' + agent.agent_name + ' (' + agent.agent_email + ') pin:' + lead.pincode +
    ' rotation#' + agent.assign_count + ' mode:manual_override', 'SUCCESS');

  let waResult = { success: false, message: 'Skipped by operator' };
  if (sendWhatsapp) {
    waResult = await whatsapp.sendWhatsAppToAgent(agent.agent_phone, leadForAssign, agent, false, null);
  }
  await db.updateLeadWhatsapp(lead.lead_id, 'p0', !sendWhatsapp ? 'Skipped' : (waResult.success ? 'Sent' : 'Failed'));

  return { ok: true, agent };
}

// ─── Manually assign a lead stuck as unassigned (e.g. NO_SOURCE_CONFIG) ──
app.post('/api/leads/:leadId/assign', async (req, res) => {
  try {
    const { leadId } = req.params;
    const lead = await db.getLeadByLeadId(leadId);
    if (!lead) return res.status(404).json({ code: 404, message: 'Lead not found' });

    const lead_source = String(req.body.lead_source || lead.lead_source || '').trim();
    const assigned_source = String(req.body.assigned_source != null ? req.body.assigned_source : (lead.assigned_source || '')).trim();
    const priorityScore = req.body.priority_score != null && req.body.priority_score !== '' ? parseFloat(req.body.priority_score) : 9.9;
    if (Number.isNaN(priorityScore)) return res.status(400).json({ code: 400, message: 'priority_score must be a number' });
    const sendWhatsapp = req.body.send_whatsapp !== false;

    const result = await manuallyAssignLead(lead, { lead_source, assigned_source, priorityScore, sendWhatsapp });
    if (!result.ok) return res.status(result.status).json({ code: result.status, message: result.message });

    return res.json({
      code: 200, message: 'Lead manually assigned',
      data: { lead_id: leadId, assigned_to: result.agent.agent_email, pincode: lead.pincode },
    });
  } catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

// ─── Bulk-assign several stuck leads, paced at a rate per minute ─────────
// Runs in the background so the request returns immediately — progress
// (each success/failure, and a final summary) shows up in the Logs tab.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

app.post('/api/leads/bulk-assign', async (req, res) => {
  try {
    const leadIds = Array.isArray(req.body.lead_ids) ? req.body.lead_ids.filter(Boolean) : [];
    if (!leadIds.length) return res.status(400).json({ code: 400, message: 'lead_ids must be a non-empty array' });

    // Blank lead_source/assigned_source overrides mean "keep each lead's own value".
    const overrideSource = req.body.lead_source != null ? String(req.body.lead_source).trim() : '';
    const overrideAffiliate = req.body.assigned_source != null ? String(req.body.assigned_source).trim() : null;

    const priorityScore = req.body.priority_score != null && req.body.priority_score !== '' ? parseFloat(req.body.priority_score) : 9.9;
    if (Number.isNaN(priorityScore)) return res.status(400).json({ code: 400, message: 'priority_score must be a number' });
    const sendWhatsapp = req.body.send_whatsapp !== false;

    const ratePerMinute = req.body.rate_per_minute != null && req.body.rate_per_minute !== '' ? parseFloat(req.body.rate_per_minute) : 0;
    if (Number.isNaN(ratePerMinute) || ratePerMinute < 0) {
      return res.status(400).json({ code: 400, message: 'rate_per_minute must be a non-negative number (0 = no limit)' });
    }
    const delayMs = ratePerMinute > 0 ? Math.ceil(60000 / ratePerMinute) : 0;

    (async () => {
      let assigned = 0, failed = 0;
      for (const leadId of leadIds) {
        try {
          const lead = await db.getLeadByLeadId(leadId);
          if (!lead) {
            failed++;
            await db.appendLog('BULK_ASSIGN', leadId, '', 'Lead not found — skipped', 'FAILED');
          } else {
            const lead_source = overrideSource || lead.lead_source || '';
            const assigned_source = overrideAffiliate != null ? overrideAffiliate : (lead.assigned_source || '');
            const result = await manuallyAssignLead(lead, { lead_source, assigned_source, priorityScore, sendWhatsapp });
            if (result.ok) assigned++;
            else { failed++; await db.appendLog('BULK_ASSIGN', leadId, lead.phone, result.message, 'FAILED'); }
          }
        } catch (err) {
          failed++;
          await db.appendLog('BULK_ASSIGN', leadId, '', 'Bulk assign error: ' + err.message, 'FAILED');
        }
        if (delayMs > 0) await sleep(delayMs);
      }
      await db.appendLog('BULK_ASSIGN', '', '',
        'Bulk assignment finished: ' + assigned + ' assigned, ' + failed + ' failed (of ' + leadIds.length + ')', 'SUCCESS');
    })().catch((err) => console.error('[bulkAssign] Fatal:', err));

    return res.json({
      code: 200,
      message: 'Bulk assignment started for ' + leadIds.length + ' lead(s)' + (ratePerMinute > 0 ? ' at ' + ratePerMinute + '/min' : ' (no rate limit)'),
      data: { total: leadIds.length, ratePerMinute },
    });
  } catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

// ─── Stats ──────────────────────────────────────────────────
app.get('/api/stats', async (_, res) => {
  try { return res.json({ code: 200, data: await db.getDashboardStats() }); }
  catch (e) { console.error('[stats]', e); return res.status(500).json({ code: 500, message: e.message }); }
});

// ─── Logs ───────────────────────────────────────────────────
app.get('/api/logs', async (_, res) => {
  try { return res.json({ code: 200, data: { logs: await db.getRecentLogs(200) } }); }
  catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

// ─── Agents CRUD ────────────────────────────────────────────
app.get('/api/agents', async (_, res) => {
  try { return res.json({ code: 200, data: await db.getAllAgents() }); }
  catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

app.post('/api/agents', async (req, res) => {
  try { return res.json({ code: 200, data: await db.addAgent(req.body) }); }
  catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

app.put('/api/agents/:id', async (req, res) => {
  try { return res.json({ code: 200, data: await db.updateAgent(req.params.id, req.body) }); }
  catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

app.delete('/api/agents/:id', async (req, res) => {
  try { await db.deleteAgent(req.params.id); return res.json({ code: 200, message: 'Deleted' }); }
  catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

app.post('/api/agents/bulk-delete', async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : [];
    if (!ids.length) return res.status(400).json({ code: 400, message: 'ids must be a non-empty array' });
    const deleted = await db.deleteAgents(ids);
    return res.json({ code: 200, message: 'Deleted ' + deleted + ' agent(s)', data: { deleted } });
  } catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

app.post('/api/agents/upload-csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ code: 400, message: 'No file uploaded' });
    const csvText = req.file.buffer.toString('utf-8');
    const rows = parseCSV(csvText);
    if (rows.length === 0) return res.status(400).json({ code: 400, message: 'CSV is empty or has no data rows' });
    const first = rows[0];
    const requiredCols = ['branch_id', 'agent_email', 'agent_name', 'agent_phone'];
    const missingCols = requiredCols.filter(c => !(c in first));
    if (missingCols.length > 0) {
      return res.status(400).json({
        code: 400,
        message: 'CSV missing columns: ' + missingCols.join(', '),
        hint: 'Required: branch_id, agent_email, agent_name, agent_phone. Optional: city, pincode, city_identifier, pincode_identifier',
      });
    }
    const result = await db.bulkReplaceAgents(rows);
    await db.appendLog('AGENT_UPLOAD', '', '', 'CSV uploaded: ' + result.inserted + ' agents replaced', 'SUCCESS');
    return res.json({ code: 200, message: 'Replaced all agents with ' + result.inserted + ' from CSV', data: result });
  } catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

app.get('/api/agents/download-csv', async (_, res) => {
  try {
    const agents = await db.getAllAgents();
    const headers = ['branch_id','agent_email','agent_name','agent_phone','city','pincode','city_identifier','pincode_identifier'];
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
    const { lead_source, assigned_source, assign_by, send_whatsapp, priority_score } = req.body;
    if (!lead_source || !['branch_id', 'city', 'pincode'].includes(assign_by)) {
      return res.status(400).json({ code: 400, message: 'Invalid lead_source or assign_by' });
    }
    const priorityScore = priority_score != null && priority_score !== '' ? parseFloat(priority_score) : 9.9;
    if (Number.isNaN(priorityScore)) {
      return res.status(400).json({ code: 400, message: 'priority_score must be a number' });
    }
    return res.json({
      code: 200,
      data: await db.upsertSourceConfig({
        lead_source, assigned_source: assigned_source || '', assign_by,
        send_whatsapp: send_whatsapp !== false, priority_score: priorityScore,
      }),
    });
  } catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

app.delete('/api/source-config/:id', async (req, res) => {
  try { await db.deleteSourceConfig(req.params.id); return res.json({ code: 200, message: 'Deleted' }); }
  catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

// ─── WhatsApp Template Config CRUD ──────────────────────────
app.get('/api/whatsapp-template-config', async (_, res) => {
  try { return res.json({ code: 200, data: await db.getAllWhatsappTemplateConfigs() }); }
  catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

app.post('/api/whatsapp-template-config', async (req, res) => {
  try {
    const { lead_source, template_id } = req.body;
    if (!lead_source || !template_id) {
      return res.status(400).json({ code: 400, message: 'lead_source and template_id are required' });
    }
    return res.json({ code: 200, data: await db.upsertWhatsappTemplateConfig(req.body) });
  } catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

app.delete('/api/whatsapp-template-config/:id', async (req, res) => {
  try { await db.deleteWhatsappTemplateConfig(req.params.id); return res.json({ code: 200, message: 'Deleted' }); }
  catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

// ─── System Config ──────────────────────────────────────────
app.get('/api/system-config', async (_, res) => {
  try { return res.json({ code: 200, data: await db.getAllSystemConfigs() }); }
  catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
});

app.post('/api/system-config', async (req, res) => {
  try {
    // Accept either a single { key, value } or array of { key, value }
    const entries = Array.isArray(req.body) ? req.body : [req.body];
    if (!entries.every(e => e.key && e.value !== undefined)) {
      return res.status(400).json({ code: 400, message: 'Each entry must have key and value' });
    }
    await db.bulkSetSystemConfig(entries);
    return res.json({ code: 200, message: 'Saved' });
  } catch (e) { return res.status(500).json({ code: 500, message: e.message }); }
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
