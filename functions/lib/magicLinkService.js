const admin = require('firebase-admin');
const { getWednesdaysInUpcomingMonth, getMonthLabel } = require('./dates');
const { buildHostMagicLinkEmail, buildTestDigestEmail, sendEmailViaTwilio } = require('./email');
const { buildMagicLinkUrl, generateMagicLinkToken } = require('./tokens');

const DEFAULT_CONFIG = {
  is_enabled: false,
  audience: 'test_only',
  test_emails: [],
  send_day_of_month: 25,
};

function getEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

async function getMagicLinkConfig(db) {
  const doc = await db.collection('settings').doc('magic_link_config').get();
  if (!doc.exists) return { ...DEFAULT_CONFIG };
  return { ...DEFAULT_CONFIG, ...doc.data() };
}

async function shouldRunScheduledBatch(config, now = new Date(), manualOverride = false) {
  if (manualOverride) return { proceed: true, reason: 'manual_override' };
  if (!config.is_enabled) return { proceed: false, reason: 'disabled' };
  if (now.getDate() !== Number(config.send_day_of_month)) {
    return { proceed: false, reason: 'wrong_day' };
  }
  return { proceed: true, reason: 'scheduled' };
}

async function fetchActiveHosts(db) {
  const snapshot = await db.collection('hosts').get();
  const hosts = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.available !== false) {
      hosts.push({ ...data, id: data.id ?? Number(doc.id) });
    }
  });
  hosts.sort((a, b) => a.id - b.id);
  return hosts;
}

function buildHostPayload(host, baseUrl, secret) {
  const token = generateMagicLinkToken(host.id, secret);
  const magicLinkUrl = buildMagicLinkUrl(baseUrl, host.id, token);
  return { ...host, token, magicLinkUrl };
}

async function dispatchMagicLinkEmails(db, { manualOverride = false, testEmailsOverride = null } = {}) {
  const config = await getMagicLinkConfig(db);
  const gate = await shouldRunScheduledBatch(config, new Date(), manualOverride);
  if (!gate.proceed) {
    return { sent: 0, skipped: true, reason: gate.reason, config };
  }

  const accountSid = getEnv('TWILIO_ACCOUNT_SID');
  const authToken = getEnv('TWILIO_AUTH_TOKEN');
  const fromEmail = getEnv('EMAIL_FROM', 'noreply@thesandwichproject.org');
  const fromName = getEnv('EMAIL_FROM_NAME', 'The Sandwich Project');
  const baseUrl = getEnv('HOST_FINDER_BASE_URL', 'https://tsp-host-finder-tool.web.app').replace(/\/$/, '');
  const secret = getEnv('MAGIC_LINK_SECRET');

  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured');
  }
  if (!secret) throw new Error('MAGIC_LINK_SECRET is not configured');

  const hosts = await fetchActiveHosts(db);
  const wednesdays = getWednesdaysInUpcomingMonth();
  const monthLabel = getMonthLabel();
  const hostPayloads = hosts.map((host) => buildHostPayload(host, baseUrl, secret));

  let sent = 0;
  const errors = [];
  const audience = manualOverride ? 'test_only' : config.audience;
  const effectiveConfig = { ...config, audience };

  if (audience === 'test_only') {
    const testEmails = (testEmailsOverride || config.test_emails || [])
      .map((e) => e.trim())
      .filter(Boolean);
    if (testEmails.length === 0) {
      return { sent: 0, skipped: true, reason: 'no_test_emails', config: effectiveConfig };
    }

    const digest = buildTestDigestEmail({
      hosts: hostPayloads.map(({ name, area, magicLinkUrl }) => ({ name, area, magicLinkUrl })),
      monthLabel,
      testModeNote: 'These links were routed to test recipients only. No volunteers were emailed.',
    });

    try {
      await sendEmailViaTwilio({
        to: testEmails,
        subject: digest.subject,
        html: digest.html,
        text: digest.text,
        fromEmail,
        fromName,
        accountSid,
        authToken,
      });
      sent = testEmails.length;
    } catch (error) {
      errors.push(error.message);
      throw error;
    }
  } else {
    for (const host of hostPayloads) {
      const recipient = (host.email || '').trim();
      if (!recipient) {
        errors.push(`Host ${host.id} (${host.name}) has no email — skipped`);
        continue;
      }

      const email = buildHostMagicLinkEmail({
        hostName: host.name,
        magicLinkUrl: host.magicLinkUrl,
        wednesdays,
        monthLabel,
      });

      try {
        await sendEmailViaTwilio({
          to: [recipient],
          subject: email.subject,
          html: email.html,
          text: email.text,
          fromEmail,
          fromName,
          accountSid,
          authToken,
        });
        sent += 1;
      } catch (error) {
        errors.push(`Host ${host.id}: ${error.message}`);
      }
    }
  }

  await db.collection('settings').doc('magic_link_config').set({
    last_run_at: admin.firestore.FieldValue.serverTimestamp(),
    last_run_sent_count: sent,
    last_run_errors: errors.slice(0, 20),
    last_run_mode: manualOverride ? 'manual_test' : 'scheduled',
    last_run_audience: audience,
  }, { merge: true });

  return { sent, skipped: false, reason: gate.reason, errors, hostCount: hosts.length, config: effectiveConfig };
}

async function verifyMagicLinkRequest(db, hostId, token, secret) {
  const { verifyMagicLinkToken } = require('./tokens');
  if (!verifyMagicLinkToken(hostId, token, secret)) {
    throw new Error('Invalid or expired magic link');
  }

  const doc = await db.collection('hosts').doc(String(hostId)).get();
  if (!doc.exists) throw new Error('Host not found');

  const host = doc.data();
  return {
    id: host.id ?? Number(hostId),
    name: host.name,
    area: host.area,
    unavailable_dates: Array.isArray(host.unavailable_dates) ? host.unavailable_dates : [],
  };
}

async function updateHostUnavailableDates(db, { hostId, token, addDates = [], removeDates = [], secret }) {
  const { verifyMagicLinkToken } = require('./tokens');
  if (!verifyMagicLinkToken(hostId, token, secret)) {
    throw new Error('Invalid or expired magic link');
  }

  return applyUnavailableDateChanges(db, hostId, { addDates, removeDates });
}

function sanitizeUnavailableDates(dates) {
  return [...new Set((dates || []).filter((dateStr) => /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))))];
}

async function applyUnavailableDateChanges(db, hostId, { addDates = [], removeDates = [] } = {}) {
  const docRef = db.collection('hosts').doc(String(hostId));
  const doc = await docRef.get();
  if (!doc.exists) throw new Error('Host not found');

  const add = sanitizeUnavailableDates(addDates);
  const remove = sanitizeUnavailableDates(removeDates).filter((dateStr) => !add.includes(dateStr));
  if (add.length === 0 && remove.length === 0) {
    const current = Array.isArray(doc.data().unavailable_dates) ? doc.data().unavailable_dates : [];
    return { updated: false, unavailable_dates: [...current].sort() };
  }

  if (add.length > 0) {
    await docRef.update({
      unavailable_dates: admin.firestore.FieldValue.arrayUnion(...add),
    });
  }
  if (remove.length > 0) {
    await docRef.update({
      unavailable_dates: admin.firestore.FieldValue.arrayRemove(...remove),
    });
  }

  const updated = await docRef.get();
  const dates = Array.isArray(updated.data().unavailable_dates) ? updated.data().unavailable_dates : [];
  return { updated: true, unavailable_dates: [...dates].sort() };
}

async function saveMagicLinkConfig(db, config = {}) {
  const testEmails = Array.isArray(config.test_emails)
    ? config.test_emails.map((email) => String(email).trim()).filter(Boolean)
    : [];
  const sendDay = Number(config.send_day_of_month);
  const payload = {
    is_enabled: config.is_enabled === true,
    audience: config.audience === 'all_active_hosts' ? 'all_active_hosts' : 'test_only',
    test_emails: testEmails,
    send_day_of_month: Number.isInteger(sendDay) && sendDay >= 1 && sendDay <= 28 ? sendDay : 25,
  };
  await db.collection('settings').doc('magic_link_config').set({
    ...payload,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  return payload;
}

module.exports = {
  DEFAULT_CONFIG,
  dispatchMagicLinkEmails,
  getMagicLinkConfig,
  getEnv,
  shouldRunScheduledBatch,
  updateHostUnavailableDates,
  applyUnavailableDateChanges,
  saveMagicLinkConfig,
  verifyMagicLinkRequest,
};
