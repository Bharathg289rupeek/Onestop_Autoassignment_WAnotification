const axios = require('axios');
const config = require('../config');
const db = require('./database');

const onestopClient = axios.create({
  baseURL: config.ONESTOP_BASE_URL,
  timeout: 15000,
  headers: { 'accept': 'application/json, text/plain, */*', 'Content-Type': 'application/json' },
});

onestopClient.interceptors.request.use((req) => {
  req.headers['authorization'] = `JWT ${config.ONESTOP_JWT}`;
  return req;
});

async function assignLead(lead, agent, priorityScore, oneStopLeadSource) {
  try {
    // Defaults to 'b2c' for the OneStop assignment call — assigned_source/
    // lead_source drive Source Config matching elsewhere, not this field.
    // Callers (manual/bulk assign) can override it per-lead or per-batch.
    const leadSource = oneStopLeadSource || 'b2c';

    const payload = {
      assignedTo: agent.agent_email,
      agentCode: '', agentName: agent.agent_name, agentRole: '',
      city: lead.city || config.DEFAULT_CITY,
      firstname: lead.name, phone: String(lead.phone),
      leadSource: leadSource,
      loanAmount: parseFloat(lead.loan_amount), loanType: parseInt(lead.loan_type) || 2,
      priorityScore: priorityScore != null ? priorityScore : 9.9, stage: 'New', state: 'New', status: 'Open',
      leadID: lead.external_id || lead.lead_id, submitDay: new Date().toISOString(),
    };
    const response = await onestopClient.post('/meetingBubbleLeadsV2', payload);
    const success = response.data.code === 200;
    await db.appendLog('ONESTOP_ASSIGN', lead.lead_id, lead.phone,
      `Assigned to ${agent.agent_email} (source: ${leadSource}) → ${JSON.stringify(response.data).slice(0, 200)}`,
      success ? 'SUCCESS' : 'FAILED');
    return { success, message: response.data.message, data: response.data };
  } catch (err) {
    // axios' default "Request failed with status code 403" hides the cause —
    // include the HTTP status and the response body OneStop actually sent.
    const status = err.response?.status;
    const body = err.response?.data;
    const errMsg = body?.message || err.message;
    const detail = status
      ? ` [HTTP ${status}] ${typeof body === 'string' ? body : JSON.stringify(body)}`.slice(0, 300)
      : '';
    await db.appendLog('ONESTOP_ASSIGN', lead.lead_id, lead.phone, `Failed: ${errMsg}${detail}`, 'FAILED');
    return { success: false, message: errMsg, data: null };
  }
}

async function getLeadDetails(assignedEmail, phone) {
  try {
    const params = new URLSearchParams({ assignedTo: assignedEmail, phone: String(phone) });
    const response = await onestopClient.get(`/meetingBubbleLeadsV2?${params.toString()}`);
    if (response.data.code === 200 && response.data.leads?.length > 0) {
      const l = response.data.leads[0];
      return { success: true, callCount: l.callCount || 0, onestopLeadId: l.leadID || '' };
    }
    return { success: true, callCount: 0 };
  } catch (err) {
    return { success: false, callCount: 0, error: err.message };
  }
}

async function updateAssignment(leadId, newAgent) {
  try {
    const payload = {
      stage: 'New', state: 'New', status: 'Open', leadIds: [leadId],
      agent_detail: { agent_Email: newAgent.agent_email, agent_Name: newAgent.agent_name, agent_Phone: newAgent.agent_phone },
    };
    const response = await onestopClient.put('/meetingLeads/bulkUpdate', payload);
    await db.appendLog('ONESTOP_REASSIGN', leadId, '', `Reassigned to ${newAgent.agent_email}`, 'SUCCESS');
    return { success: true, data: response.data };
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message;
    await db.appendLog('ONESTOP_REASSIGN', leadId, '', `Failed: ${errMsg}`, 'FAILED');
    return { success: false, message: errMsg };
  }
}

/**
 * Read-only connectivity check for troubleshooting 403s: reports this
 * server's outbound IP and what the OneStop gateway answers a harmless GET
 * (lookup of a phone that doesn't exist) with the real JWT.
 *   - HTML 403 page      -> blocked in front of the API (IP allowlist / WAF)
 *   - JSON 403/401       -> reached the API, JWT rejected
 *   - 200                -> working
 */
async function diagnose() {
  let egressIp = null;
  try { egressIp = (await axios.get('https://api.ipify.org', { timeout: 8000 })).data; } catch (_) {}

  try {
    const params = new URLSearchParams({ assignedTo: 'diagnostic@invalid.local', phone: '0000000000' });
    const r = await onestopClient.get(`/meetingBubbleLeadsV2?${params.toString()}`, { validateStatus: () => true });
    const contentType = String(r.headers['content-type'] || '');
    const bodyText = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
    const isHtml = contentType.includes('html') || /^\s*<html/i.test(bodyText);
    let verdict;
    if (r.status === 200) verdict = 'OK — OneStop reachable and JWT accepted';
    else if (isHtml) verdict = 'BLOCKED BEFORE THE API — HTML error page from the gateway/WAF; ask infra to allow this server\'s outbound IP';
    else verdict = 'Reached the API but it rejected the request (HTTP ' + r.status + ') — check ONESTOP_JWT';
    return { egressIp, status: r.status, contentType, bodySnippet: bodyText.slice(0, 200), verdict };
  } catch (err) {
    return { egressIp, status: null, error: err.message, verdict: 'Could not reach OneStop at all: ' + err.message };
  }
}

module.exports = { assignLead, getLeadDetails, updateAssignment, diagnose };
