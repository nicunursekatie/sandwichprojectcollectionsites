const { formatDisplayDate, getMonthLabel } = require('./dates');

const BRAND = {
  primary: '#007E8C',
  secondary: '#236383',
  accent: '#FBAD3F',
  accentAlt: '#47B3CB',
  danger: '#A31C41',
  logoUrl: 'https://tsp-host-finder-tool.web.app/LOGOS/CMYK_PRINT_TSP-01-01.jpg',
};

function buildHostMagicLinkEmail({ hostName, magicLinkUrl, wednesdays, monthLabel }) {
  const wednesdayList = wednesdays
    .map((dateStr) => `<li style="margin:8px 0;color:#444;">${formatDisplayDate(dateStr)}</li>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mark Your Unavailable Wednesdays</title>
</head>
<body style="margin:0;padding:0;font-family:'Inter',Arial,sans-serif;background:#f5f5f5;">
  <div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accentAlt} 100%);padding:32px 24px;text-align:center;color:#ffffff;">
      <img src="${BRAND.logoUrl}" alt="The Sandwich Project" style="max-height:72px;width:auto;margin-bottom:16px;" />
      <h1 style="margin:0;font-size:24px;font-weight:700;">Host Availability Check-In</h1>
    </div>
    <div style="padding:32px 24px;color:#333;line-height:1.7;">
      <p style="font-size:16px;margin:0 0 16px;">Hi ${hostName || 'there'},</p>
      <p style="font-size:16px;margin:0 0 16px;">
        Please let us know which <strong>Wednesdays in ${monthLabel}</strong> you will <em>not</em> be available to receive sandwich drop-offs.
      </p>
      <div style="margin:24px 0;padding:20px;background:#f9f9f9;border-left:4px solid ${BRAND.accent};border-radius:8px;">
        <h2 style="margin:0 0 12px;color:${BRAND.secondary};font-size:18px;">Collection Wednesdays</h2>
        <ul style="margin:0;padding-left:20px;">${wednesdayList}</ul>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${magicLinkUrl}" style="display:inline-block;background:${BRAND.accent};color:#333;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">
          Update My Availability
        </a>
      </div>
      <p style="font-size:14px;color:#666;margin:0;">
        This secure link is unique to you. Tap the button on your phone to toggle off any weeks you cannot host.
      </p>
    </div>
    <div style="background:${BRAND.secondary};color:#ffffff;padding:24px;text-align:center;font-size:14px;">
      <p style="margin:0 0 8px;"><strong>The Sandwich Project</strong></p>
      <p style="margin:0;"><a href="https://tsp-host-finder-tool.web.app/" style="color:${BRAND.accentAlt};text-decoration:none;">Host Finder Tool</a></p>
    </div>
  </div>
</body>
</html>`;

  const text = [
    `Hi ${hostName || 'there'},`,
    '',
    `Please mark which Wednesdays in ${monthLabel} you will NOT be available to receive sandwich drop-offs.`,
    '',
    ...wednesdays.map((d) => `- ${formatDisplayDate(d)}`),
    '',
    `Update your availability: ${magicLinkUrl}`,
    '',
    'The Sandwich Project',
  ].join('\n');

  return {
    subject: `Action needed: Mark your unavailable Wednesdays (${monthLabel})`,
    html,
    text,
  };
}

function buildTestDigestEmail({ hosts, monthLabel, testModeNote }) {
  const rows = hosts
    .map(({ name, area, magicLinkUrl }) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${name}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${area || '—'}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
          <a href="${magicLinkUrl}" style="color:${BRAND.primary};word-break:break-all;">Open link</a>
        </td>
      </tr>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en"><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;">
  <div style="max-width:720px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
    <div style="background:${BRAND.danger};color:#fff;padding:20px 24px;">
      <h1 style="margin:0;font-size:20px;">TEST BATCH — Magic Link Digest</h1>
      <p style="margin:8px 0 0;font-size:14px;">${testModeNote}</p>
    </div>
    <div style="padding:24px;">
      <p style="color:#333;">Links for <strong>${monthLabel}</strong> (${hosts.length} active hosts):</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f3f4f6;text-align:left;">
            <th style="padding:10px;">Host</th>
            <th style="padding:10px;">Area</th>
            <th style="padding:10px;">Magic Link</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>
</body></html>`;

  return {
    subject: `[TEST] Magic Link batch — ${monthLabel} (${hosts.length} hosts)`,
    html,
    text: hosts.map((h) => `${h.name}: ${h.magicLinkUrl}`).join('\n'),
  };
}

async function sendEmailViaTwilio({ to, subject, html, text, fromEmail, fromName, accountSid, authToken }) {
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const response = await fetch('https://comms.twilio.com/v1/Emails', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: { address: fromEmail, name: fromName || 'The Sandwich Project' },
      to: to.map((address) => ({ address })),
      content: { subject, html, text },
    }),
  });

  if (response.status !== 202 && !response.ok) {
    const body = await response.text();
    throw new Error(`Twilio Email error (${response.status}): ${body}`);
  }
}

/** @deprecated Use sendEmailViaTwilio */
async function sendEmailViaSendGrid() {
  throw new Error('SendGrid is no longer configured. Use Twilio Email API.');
}

module.exports = {
  BRAND,
  buildHostMagicLinkEmail,
  buildTestDigestEmail,
  getMonthLabel,
  sendEmailViaTwilio,
  sendEmailViaSendGrid,
};
