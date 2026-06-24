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
const twilioAccountSid = defineSecret('TWILIO_ACCOUNT_SID');
const twilioAuthToken = defineSecret('TWILIO_AUTH_TOKEN');
const emailFrom = defineString('EMAIL_FROM', { default: 'noreply@thesandwichproject.org' });
const emailFromName = defineString('EMAIL_FROM_NAME', { default: 'The Sandwich Project' });
const hostFinderBaseUrl = defineString('HOST_FINDER_BASE_URL', {
  default: 'https://tsp-host-finder-tool.web.app',
});

function bindRuntimeEnv() {
  process.env.MAGIC_LINK_SECRET = magicLinkSecret.value();
  process.env.TWILIO_ACCOUNT_SID = twilioAccountSid.value();
  process.env.TWILIO_AUTH_TOKEN = twilioAuthToken.value();
  process.env.EMAIL_FROM = emailFrom.value();
  process.env.EMAIL_FROM_NAME = emailFromName.value();
  process.env.HOST_FINDER_BASE_URL = hostFinderBaseUrl.value();
}

setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10,
});

const functionSecrets = [magicLinkSecret, twilioAccountSid, twilioAuthToken];

const httpOptions = {
  secrets: functionSecrets,
  cors: true,
  invoker: 'public',
};

function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.rawBody?.toString('utf8') || '{}');
  } catch {
    return {};
  }
}

/** POST — manual test batch (triggered from Admin UI) */
exports.sendMagicLinkBatch = onRequest(httpOptions, async (req, res) => {
  bindRuntimeEnv();

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = parseJsonBody(req);
    const result = await dispatchMagicLinkEmails(db, {
      manualOverride: Boolean(body.manual_override ?? true),
      testEmailsOverride: Array.isArray(body.test_emails) ? body.test_emails : null,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
/** GET /verifyMagicLink?host=1&token=abc */
exports.verifyMagicLink = onRequest(httpOptions, async (req, res) => {
  bindRuntimeEnv();

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
exports.updateUnavailableDates = onRequest(httpOptions, async (req, res) => {
  bindRuntimeEnv();

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
