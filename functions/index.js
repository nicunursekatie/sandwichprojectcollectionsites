const crypto = require('crypto');
const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret, defineString } = require('firebase-functions/params');
const { getWednesdaysInUpcomingMonth, getMonthLabel } = require('./lib/dates');
const {
  dispatchMagicLinkEmails,
  updateHostUnavailableDates,
  applyUnavailableDateChanges,
  saveMagicLinkConfig,
  verifyMagicLinkRequest,
} = require('./lib/magicLinkService');
const { resolveManualBatchRequest } = require('./lib/manualBatch');

admin.initializeApp();
const db = admin.firestore();

const magicLinkSecret = defineSecret('MAGIC_LINK_SECRET');
const adminApiSecret = defineSecret('ADMIN_API_SECRET');
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

function secretsMatch(provided, expected) {
  const left = crypto.createHash('sha256').update(String(provided)).digest();
  const right = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(left, right);
}

function requireAdminSecret(req, res) {
  const header = req.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  const expected = adminApiSecret.value();
  if (!token || !expected || !secretsMatch(token, expected)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.rawBody?.toString('utf8') || '{}');
  } catch {
    return {};
  }
}

/** POST — manual test batch (triggered from Admin UI) */
exports.sendMagicLinkBatch = onRequest({
  ...httpOptions,
  secrets: [...functionSecrets, adminApiSecret],
}, async (req, res) => {
  bindRuntimeEnv();

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!requireAdminSecret(req, res)) return;

  try {
    const body = parseJsonBody(req);
    const batch = resolveManualBatchRequest(body);
    if (!batch.ok) {
      res.status(batch.status).json({ error: batch.error });
      return;
    }
    const result = await dispatchMagicLinkEmails(db, {
      manualOverride: batch.manualOverride,
      testEmailsOverride: batch.testEmailsOverride,
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

const adminHttpOptions = {
  ...httpOptions,
  secrets: [...functionSecrets, adminApiSecret],
};

/** POST { host_id, add_dates[], remove_dates[] } — admin secret required */
exports.adminSetUnavailableDates = onRequest(adminHttpOptions, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAdminSecret(req, res)) return;

  try {
    const body = parseJsonBody(req);
    if (!body.host_id) {
      res.status(400).json({ error: 'host_id is required' });
      return;
    }
    if (!Array.isArray(body.add_dates) && !Array.isArray(body.remove_dates)) {
      res.status(400).json({ error: 'add_dates or remove_dates is required' });
      return;
    }
    const result = await applyUnavailableDateChanges(db, body.host_id, {
      addDates: body.add_dates,
      removeDates: body.remove_dates,
    });
    res.status(200).json(result);
  } catch (error) {
    const status = error.message === 'Host not found' ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

/** POST { op, host_id, data } — admin secret required. op is set, merge, delete, or batchMerge. */
exports.adminHostWrite = onRequest(adminHttpOptions, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAdminSecret(req, res)) return;

  const plainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

  try {
    const body = parseJsonBody(req);
    if (body.op === 'delete') {
      if (!body.host_id) throw new Error('host_id is required');
      await db.collection('hosts').doc(String(body.host_id)).delete();
      res.status(200).json({ ok: true });
      return;
    }
    if (body.op === 'set' || body.op === 'merge') {
      if (!body.host_id || !plainObject(body.data)) throw new Error('host_id and data are required');
      const docRef = db.collection('hosts').doc(String(body.host_id));
      if (body.op === 'merge') await docRef.set(body.data, { merge: true });
      else {
        await db.runTransaction(async (transaction) => {
          const existing = await transaction.get(docRef);
          const incomingDates = body.data.unavailable_dates;
          const data = { ...body.data };
          delete data.unavailable_dates;
          if (existing.exists && Array.isArray(existing.data().unavailable_dates)) {
            data.unavailable_dates = existing.data().unavailable_dates;
          } else if (!existing.exists && Array.isArray(incomingDates)) {
            data.unavailable_dates = incomingDates;
          }
          transaction.set(docRef, data);
        });
      }
      res.status(200).json({ ok: true });
      return;
    }
    if (body.op === 'batchMerge') {
      if (!Array.isArray(body.writes) || body.writes.length === 0) throw new Error('writes are required');
      const batch = db.batch();
      body.writes.forEach((write) => {
        if (!write.host_id || !plainObject(write.data)) throw new Error('each write needs host_id and data');
        batch.set(db.collection('hosts').doc(String(write.host_id)), write.data, { merge: true });
      });
      await batch.commit();
      res.status(200).json({ ok: true });
      return;
    }
    res.status(400).json({ error: 'Unknown op' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/** POST magic-link settings — admin secret required */
exports.adminSaveMagicLinkConfig = onRequest(adminHttpOptions, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAdminSecret(req, res)) return;

  try {
    const body = parseJsonBody(req);
    const saved = await saveMagicLinkConfig(db, body);
    res.status(200).json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
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
