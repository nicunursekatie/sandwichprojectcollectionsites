const { resolveManualBatchRequest } = require('./manualBatch');

describe('resolveManualBatchRequest', () => {
  it('rejects a manual batch with no test recipients', () => {
    const result = resolveManualBatchRequest({ manual_override: true });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  it('keeps a manual batch limited to the supplied test recipients', () => {
    const result = resolveManualBatchRequest({
      manual_override: true,
      test_emails: [' admin@example.com ', ''],
    });
    expect(result).toEqual({
      ok: true,
      manualOverride: true,
      testEmailsOverride: ['admin@example.com'],
    });
  });
});
