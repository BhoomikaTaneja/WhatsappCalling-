require('dotenv').config();

const required = ['WHATSAPP_TOKEN', 'PHONE_NUMBER_ID', 'APP_SECRET', 'WEBHOOK_VERIFY_TOKEN'];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const config = Object.freeze({
  PORT: parseInt(process.env.PORT || '19000', 10),
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN,
  PHONE_NUMBER_ID: process.env.PHONE_NUMBER_ID,
  WABA_ID: process.env.WABA_ID || '',
  APP_SECRET: process.env.APP_SECRET,
  WEBHOOK_VERIFY_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN,
  GRAPH_API_VERSION: process.env.GRAPH_API_VERSION || 'v22.0',
  get GRAPH_API_BASE() {
    return `https://graph.facebook.com/${this.GRAPH_API_VERSION}`;
  }
});

module.exports = config;
