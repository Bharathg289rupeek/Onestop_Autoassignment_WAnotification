const axios = require('axios');
const config = require('../config');
const db = require('./database');

function formatPhone(phone) {
  let cleaned = String(phone).replace(/[\s\-\+\(\)]/g, '');
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  return cleaned;
}

// Resolve a param token against lead/agent context.
// Supported tokens: lead.name, lead.phone, lead.loan_amount (formatted),
//   lead.loan_type, lead.cta_link, lead.city, lead.branch_id, lead.pincode,
//   agent.name, agent.email, agent.phone
// Anything else is returned as a literal string.
function resolveParam(token, lead, agent, ctaLink) {
  if (!token) return '';
  switch (token.trim()) {
    case 'lead.name':        return lead.name || '';
    case 'lead.phone':       return String(lead.phone || '');
    case 'lead.loan_amount': return Number(lead.loan_amount || 0).toLocaleString('en-IN');
    case 'lead.loan_type':   return String(lead.loan_type || '');
    case 'lead.cta_link':    return ctaLink;
    case 'lead.city':        return lead.city || '';
    case 'lead.branch_id':   return lead.branch_id || '';
    case 'lead.pincode':     return String(lead.pincode || '');
    case 'agent.name':       return agent.agent_name || '';
    case 'agent.email':      return agent.agent_email || '';
    case 'agent.phone':      return String(agent.agent_phone || '');
    default:                 return token; // literal passthrough
  }
}

/**
 * Send WhatsApp template message via Gupshup.
 *
 * Priority for template ID:
 *   1. overrideTemplateId (from POST payload `template_id`)
 *   2. Per-source config in DB (whatsapp_template_config)
 *   3. Environment variable GUPSHUP_TEMPLATE_ID / GUPSHUP_REASSIGN_TEMPLATE_ID
 *
 * Priority for params:
 *   1. Per-source config in DB (param1..param5 tokens)
 *   2. Default: [lead.name, lead.phone, lead.loan_amount, lead.loan_type, lead.cta_link]
 */
async function sendWhatsAppToAgent(agentPhone, lead, agent, isReassignment, overrideTemplateId) {
  // ── Resolve CTA base URL (prefer DB setting, fall back to config) ──
  const ctaBase = (await db.getSystemConfig('LEAD_CTA_BASE_URL')) || config.LEAD_CTA_BASE_URL;
  const ctaLink = ctaBase + '/leads/details/' + lead.lead_id;

  // ── Fetch per-source template config from DB ──
  const tplConfig = await db.getWhatsappTemplateConfig(lead.lead_source);

  // ── Pick template ID ──
  let templateId;
  if (overrideTemplateId) {
    templateId = overrideTemplateId;
  } else if (tplConfig) {
    templateId = isReassignment
      ? (tplConfig.reassign_template_id || tplConfig.template_id)
      : tplConfig.template_id;
  } else {
    templateId = isReassignment
      ? (config.GUPSHUP_REASSIGN_TEMPLATE_ID || config.GUPSHUP_TEMPLATE_ID)
      : config.GUPSHUP_TEMPLATE_ID;
  }

  if (!templateId) {
    console.error('[WhatsApp] No template ID configured for source:', lead.lead_source);
    await db.appendLog(
      isReassignment ? 'WHATSAPP_P1' : 'WHATSAPP_P0',
      lead.lead_id, lead.phone,
      'No template ID configured (source: ' + lead.lead_source + ') — skipping WhatsApp', 'FAILED'
    );
    return { success: false, message: 'No template ID configured' };
  }

  // ── Build params array ──
  let params;
  if (tplConfig && !overrideTemplateId) {
    // Use the configured param tokens
    params = [
      tplConfig.param1, tplConfig.param2, tplConfig.param3,
      tplConfig.param4, tplConfig.param5,
    ].filter(p => p != null && p !== '').map(token => resolveParam(token, lead, agent, ctaLink));
  } else {
    // Default params
    params = [
      lead.name || '',
      String(lead.phone || ''),
      Number(lead.loan_amount || 0).toLocaleString('en-IN'),
      String(lead.loan_type || ''),
      ctaLink,
    ];
  }

  try {
    const destination = formatPhone(agentPhone);
    const templateData = JSON.stringify({ id: templateId, params });

    const urlParams = new URLSearchParams();
    urlParams.append('channel', 'whatsapp');
    urlParams.append('source', config.GUPSHUP_SOURCE_NUMBER);
    urlParams.append('destination', destination);
    urlParams.append('src.name', config.GUPSHUP_APP_NAME);
    urlParams.append('template', templateData);

    console.log('[WhatsApp] Sending to ' + destination + ' template=' + templateId + ' params=' + JSON.stringify(params));

    const response = await axios.post(config.GUPSHUP_API_URL, urlParams.toString(), {
      headers: {
        'apikey': config.GUPSHUP_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 15000,
    });

    const success = (response.status === 200 || response.status === 202) &&
                    response.data && response.data.status === 'submitted';
    const messageId = response.data ? (response.data.messageId || '') : '';

    await db.appendLog(
      isReassignment ? 'WHATSAPP_P1' : 'WHATSAPP_P0',
      lead.lead_id, lead.phone,
      'WA to ' + destination + ' (tpl: ' + templateId + '): ' + (success ? 'Sent (msgId: ' + messageId + ')' : 'Failed') +
        ' → ' + JSON.stringify(response.data).slice(0, 200),
      success ? 'SUCCESS' : 'FAILED'
    );

    return { success, message: success ? 'Sent' : 'Failed', messageId };
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message;
    console.error('[WhatsApp] Error for ' + agentPhone + ':', errMsg);
    await db.appendLog(
      isReassignment ? 'WHATSAPP_P1' : 'WHATSAPP_P0',
      lead.lead_id, lead.phone,
      'WA to ' + agentPhone + ' failed: ' + errMsg, 'FAILED'
    );
    return { success: false, message: errMsg };
  }
}

module.exports = { sendWhatsAppToAgent };
