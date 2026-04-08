const config = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  PORT: parseInt(process.env.PORT || '3000', 10),

  // Onestop APIs
  ONESTOP_BASE_URL: 'https://api.rupeek.com/leadsvcapi/v2/lead',
  ONESTOP_JWT: process.env.ONESTOP_JWT || '',

  // Gupshup WhatsApp
  GUPSHUP_API_URL: 'https://api.gupshup.io/wa/api/v1/template/msg',
  GUPSHUP_API_KEY: process.env.GUPSHUP_API_KEY || '',
  GUPSHUP_APP_NAME: process.env.GUPSHUP_APP_NAME || '',
  GUPSHUP_SOURCE_NUMBER: process.env.GUPSHUP_SOURCE_NUMBER || '917834811114',
  GUPSHUP_TEMPLATE_ID: process.env.GUPSHUP_TEMPLATE_ID || '',
  GUPSHUP_REASSIGN_TEMPLATE_ID: process.env.GUPSHUP_REASSIGN_TEMPLATE_ID || '',

  // Lead system
  LEAD_CTA_BASE_URL: process.env.LEAD_CTA_BASE_URL || 'https://leadfusion.rupeek.com',
  REASSIGN_DELAY_MINUTES: parseInt(process.env.REASSIGN_DELAY_MINUTES || '10', 10),
  DEFAULT_CITY: process.env.DEFAULT_CITY || 'bangalore',
};

module.exports = config;
