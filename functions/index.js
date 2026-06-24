const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret, defineString } = require('firebase-functions/params');
const { getWednesdaysInUpcomingMonth, getMonthLabel } = require('./lib/dates');
const {
  dispatchMagicLinkEmails,
  updateHostUnavailableDates,
  verifyMagicLinkRequest,
} = require('./lib/magicLinkService');

admin.initializeApp();
const db = admin.firestore();

const magicLinkSecret = defineSecret('MAGIC_LINK_SECRET');
const adminApiSecret = defineSecret('ADMIN_API_SECRET');
const sendgridApiKey = defineSecret('SENDGRID_API_KEY');
const emailFrom = defineString('EMAIL_FROM', { default: 'noreply@thesandwichproject.org' });
const emailFromName = defineString('EMAIL_FROM_NAME', { default: 'The Sandwich Project' });
const hostFinderBaseUrl = defineString('HOST_FINDER_BASE_URL', {
  default: 'https://tsp-host-finder-tool.web.app',
});

function bindRuntimeEnv() {
  process.env.MAGIC_LINK_SECRET = magicLinkSecret.value();
  process.env.ADMIN_API_SECRET = adminApiSecret.value();
  process.env.SENDGRID_API_KEY = sendgridApiKey.value();
  process.env.EMAIL_FROM = emailFrom.value();
  process.env.EMAIL_FROM_NAME = emailFromName.value();
  process.env.HOST_FINDER_BASE_URL = hostFinderBaseUrl.value();
}

setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10,
});

function setCors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function handleOptions(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
}

function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.rawBody?.toString('utf8') || '{}');
  } catch {
    return {};
  }
}

function requireAdminSecret(req) {
  const expected = process.env.ADMIN_API_SECRET;
  if (!expected) throw new Error('ADMIN_API_SECRET is not configured');
  const provided = req.get('Authorization')?.replace(/^Bearer\s+/i, '') || req.get('x-admin-secret');
  if (provided !== expected) throw new Error('Unauthorized');
}

const functionSecrets = [magicLinkSecret, adminApiSecret, sendgridApiKey];

/** GET /verifyMagicLink?host=1&token=abc */
exports.verifyMagicLink = onRequest({ secrets: functionSecrets }, async (req, res) => {
  bindRuntimeEnv();
  if (handleOptions(req, res)) return;
  setCors(res);

  try {
    const hostId = req.query.host;
    const token = req.query.token;
    const secret = process.env.MAGIC_LINK_SECRET;
    if (!secret) throw new Error('MAGIC_LINK_SECRET is not configured');

    const host = await verifyMagicLinkRequest(db, hostId, token, secret);
    const wednesdays = getWednesdaysInUpcomingMonth();

    res.status(200).json({
      host,
      wednesdays,
      monthLabel: getMonthLabel(),
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

/** POST { host_id, token, add_dates[], remove_dates[] } */
exports.updateUnavailableDates = onRequest({ secrets: functionSecrets }, async (req, res) => {
  bindRuntimeEnv();
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = parseJsonBody(req);
    const secret = process.env.MAGIC_LINK_SECRET;
    if (!secret) throw new Error('MAGIC_LINK_SECRET is not configured');

    const result = await updateHostUnavailableDates(db, {
      hostId: body.host_id,
      token: body.token,
      addDates: body.add_dates,
      removeDates: body.remove_dates,
      secret,
    });

    res.status(200).json(result);
  } catch (error) {
    const status = error.message.includes('Invalid') ? 401 : 400;
    res.status(status).json({ error: error.message });
  }
});

/** POST with Authorization: Bearer <ADMIN_API_SECRET> — manual test batch */
exports.sendMagicLinkBatch = onRequest({ secrets: functionSecrets }, async (req, res) => {
  bindRuntimeEnv();
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    requireAdminSecret(req);
    const body = parseJsonBody(req);
    const result = await dispatchMagicLinkEmails(db, {
      manualOverride: Boolean(body.manual_override ?? true),
    });
    res.status(200).json(result);
  } catch (error) {
    const status = error.message === 'Unauthorized' ? 401 : 500;
    res.status(status).json({ error: error.message });
  }
});

/** Runs daily at 9:00 AM Eastern — respects kill switch + send_day_of_month */
exports.scheduledMagicLinkEmails = onSchedule(
  {
    schedule: '0 9 * * *',
    timeZone: 'America/New_York',
    secrets: functionSecrets,
  },
  async () => {
    bindRuntimeEnv();
    const result = await dispatchMagicLinkEmails(db, { manualOverride: false });
    console.log('scheduledMagicLinkEmails result:', JSON.stringify(result));
  }
);
