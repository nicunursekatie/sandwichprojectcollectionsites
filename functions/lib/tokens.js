const crypto = require('crypto');

function generateMagicLinkToken(hostId, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(`host:${hostId}`)
    .digest('hex')
    .slice(0, 32);
}

function verifyMagicLinkToken(hostId, token, secret) {
  if (!hostId || !token || !secret) return false;
  const expected = generateMagicLinkToken(hostId, secret);
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

function buildMagicLinkUrl(baseUrl, hostId, token) {
  const url = new URL('/availability', baseUrl);
  url.searchParams.set('host', String(hostId));
  url.searchParams.set('token', token);
  return url.toString();
}

module.exports = {
  buildMagicLinkUrl,
  generateMagicLinkToken,
  verifyMagicLinkToken,
};
