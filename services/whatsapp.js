const axios = require('axios');
const config = require('../config');
const db = require('./database');

function formatPhone(phone) {
  let cleaned = String(phone).replace(/[\s\-\+\(\)]/g, '');
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  return cleaned;
}

/**
 * Send WhatsApp template message via Gupshup.
 *
 * Template params:
 *   {{1}} - Lead Name
 *   {{2}} - Lead Phone
 *   {{3}} - Loan Amount
 *   {{4}} - Loan Type
 *   {{5}} - Open Lead Link
 *
 * Uses: POST https://api.gupshup.io/wa/api/v1/template/msg
 * Content-Type: application/x-www-form-urlencoded
 */
async function sendWhatsAppToAgent(agentPhone, lead, agent, isReassignment) {
  var templateId = isReassignment
    ? (config.GUPSHUP_REASSIGN_TEMPLATE_ID || config.GUPSHUP_TEMPLATE_ID)
    : config.GUPSHUP_TEMPLATE_ID;

  if (!templateId) {
    console.error('[WhatsApp] No template ID configured');
    await db.appendLog(
      isReassignment ? 'WHATSAPP_P1' : 'WHATSAPP_P0',
      lead.lead_id, lead.phone,
      'No template ID configured — skipping WhatsApp', 'FAILED'
    );
    return { success: false, message: 'No template ID configured' };
  }

  try {
    var destination = formatPhone(agentPhone);
    var ctaLink = config.LEAD_CTA_BASE_URL + '/leads/details/' + lead.lead_id;
    var loanAmountFormatted = Number(lead.loan_amount || 0).toLocaleString('en-IN');
    var loanTypeStr = String(lead.loan_type || '');

    // Build template JSON (same format as Gupshup Python example)
    var templateData = JSON.stringify({
      id: templateId,
      params: [
        lead.name || '',
        String(lead.phone || ''),
        loanAmountFormatted,
        loanTypeStr,
        ctaLink,
      ],
    });

    // Form-urlencoded payload
    var params = new URLSearchParams();
    params.append('channel', 'whatsapp');
    params.append('source', config.GUPSHUP_SOURCE_NUMBER);
    params.append('destination', destination);
    params.append('src.name', config.GUPSHUP_APP_NAME);
    params.append('template', templateData);

    console.log('[WhatsApp] Sending template to ' + destination + ' (template: ' + templateId + ')');

    var response = await axios.post(config.GUPSHUP_API_URL, params.toString(), {
      headers: {
        'apikey': config.GUPSHUP_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 15000,
    });

    var success = (response.status === 200 || response.status === 202) &&
                  response.data && response.data.status === 'submitted';

    var messageId = response.data ? (response.data.messageId || '') : '';

    await db.appendLog(
      isReassignment ? 'WHATSAPP_P1' : 'WHATSAPP_P0',
      lead.lead_id, lead.phone,
      'WhatsApp template to ' + destination + ': ' + (success ? 'Sent (msgId: ' + messageId + ')' : 'Failed') +
        ' → ' + JSON.stringify(response.data).slice(0, 200),
      success ? 'SUCCESS' : 'FAILED'
    );

    return { success: success, message: success ? 'Sent' : 'Failed', messageId: messageId };
  } catch (err) {
    var errMsg = '';
    if (err.response && err.response.data) {
      errMsg = err.response.data.message || JSON.stringify(err.response.data).slice(0, 200);
    } else {
      errMsg = err.message;
    }

    console.error('[WhatsApp] Error for ' + agentPhone + ':', errMsg);

    await db.appendLog(
      isReassignment ? 'WHATSAPP_P1' : 'WHATSAPP_P0',
      lead.lead_id, lead.phone,
      'WhatsApp to ' + agentPhone + ' failed: ' + errMsg, 'FAILED'
    );

    return { success: false, message: errMsg };
  }
}

module.exports = { sendWhatsAppToAgent };
