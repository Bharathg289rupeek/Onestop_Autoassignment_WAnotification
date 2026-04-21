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

async function assignLead(lead, agent) {
  try {
    // Change 1: use assigned_source from payload if provided, else lead_source, else 'Qualified'
    const leadSource = lead.assigned_source || lead.lead_source || 'Qualified';

    const payload = {
      assignedTo: agent.agent_email,
      agentCode: '', agentName: agent.agent_name, agentRole: '',
      city: lead.city || config.DEFAULT_CITY,
      firstname: lead.name, phone: String(lead.phone),
      leadSource: leadSource,
      loanAmount: parseFloat(lead.loan_amount), loanType: parseInt(lead.loan_type) || 2,
      priorityScore: 1.0, stage: 'New', state: 'New', status: 'Open',
      leadID: lead.lead_id, submitDay: new Date().toISOString(),
    };
    const response = await onestopClient.post('/meetingBubbleLeadsV2', payload);
    const success = response.data.code === 200;
    await db.appendLog('ONESTOP_ASSIGN', lead.lead_id, lead.phone,
      `Assigned to ${agent.agent_email} (source: ${leadSource}) → ${JSON.stringify(response.data).slice(0, 200)}`,
      success ? 'SUCCESS' : 'FAILED');
    return { success, message: response.data.message, data: response.data };
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message;
    await db.appendLog('ONESTOP_ASSIGN', lead.lead_id, lead.phone, `Failed: ${errMsg}`, 'FAILED');
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

module.exports = { assignLead, getLeadDetails, updateAssignment };
