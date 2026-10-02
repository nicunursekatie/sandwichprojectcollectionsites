function resolveManualBatchRequest(body = {}) {
  const rawEmails = Array.isArray(body.test_emails) ? body.test_emails : [];
  const testEmails = rawEmails.map((email) => String(email).trim()).filter(Boolean);

  if (testEmails.length === 0) {
    return {
      ok: false,
      status: 400,
      error: 'A test batch requires at least one test recipient.',
    };
  }

  return {
    ok: true,
    manualOverride: true,
    testEmailsOverride: testEmails,
  };
}

module.exports = { resolveManualBatchRequest };
