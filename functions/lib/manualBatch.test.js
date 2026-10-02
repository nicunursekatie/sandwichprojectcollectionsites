const { resolveManualBatchRequest } = require('./manualBatch');

describe('resolveManualBatchRequest', () => {
  it('rejects a manual batch with no test recipients', () => {
    expect(resolveManualBatchRequest({}).ok).toBe(false);
    expect(resolveManualBatchRequest({ manual_override: false }).status).toBe(400);
  });

  it('keeps a manual batch limited to the supplied test recipients', () => {
    const result = resolveManualBatchRequest({
      manual_override: false,
      test_emails: [' admin@example.com ', ''],
    });
    expect(result).toEqual({
      ok: true,
      manualOverride: true,
      testEmailsOverride: ['admin@example.com'],
    });
  });
});
