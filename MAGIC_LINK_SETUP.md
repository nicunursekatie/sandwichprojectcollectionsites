# Magic Link Unavailability Tracker — Setup Guide

This feature replaces the Google Form workflow with secure magic-link emails that let hosts mark unavailable Wednesdays. It includes a **master kill switch** so you can test safely in production.

## Architecture

| Layer | What it does |
|-------|----------------|
| **Firestore `hosts`** | Each host document gains an optional `unavailable_dates: string[]` field (`YYYY-MM-DD`) |
| **Firestore `settings/magic_link_config`** | Kill switch, audience mode, test emails, send schedule |
| **Cloud Functions** | Token verification, date updates, scheduled + manual email dispatch |
| **React (`public/app.js`)** | Filters hosts by upcoming Wednesday, `/availability` page, admin controls |

## Task Checklist (All 8 Implemented)

1. **Schema** — `unavailable_dates` array on existing `hosts` documents (no migration required)
2. **Client filter** — `getUpcomingWednesday()` + `isHostUnavailableOnDate()` in `app.helpers.js`
3. **Magic Link API** — `verifyMagicLink`, `updateUnavailableDates` Cloud Functions
4. **Global config** — `settings/magic_link_config` document
5. **Admin panel** — Magic Link card in Admin → Manage Hosts
6. **Host override** — Wednesday toggles in admin host list + edit modal
7. **Cron job** — `scheduledMagicLinkEmails` runs daily at 9:00 AM Eastern
8. **Email dispatch** — SendGrid HTML emails with brand colors + logo

---

## Step 1: Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

This adds read/write access for the `settings` collection (same open pattern as `hosts` today).

---

## Step 2: Configure Cloud Function Secrets

Set these in Firebase (Functions v2 uses Secret Manager or `.env` files):

```bash
firebase functions:secrets:set MAGIC_LINK_SECRET
firebase functions:secrets:set ADMIN_API_SECRET
firebase functions:secrets:set SENDGRID_API_KEY
```

Recommended values:

| Variable | Purpose |
|----------|---------|
| `MAGIC_LINK_SECRET` | Long random string used to HMAC-sign magic links per host |
| `ADMIN_API_SECRET` | Required for "Send Test Batch Now" from admin UI |
| `SENDGRID_API_KEY` | SendGrid API key for outbound email |
| `EMAIL_FROM` | Verified sender, e.g. `noreply@thesandwichproject.org` |
| `EMAIL_FROM_NAME` | Display name, e.g. `The Sandwich Project` |
| `HOST_FINDER_BASE_URL` | `https://tsp-host-finder-tool.web.app` |

For local `.env` during development, copy `functions/.env.example` to `functions/.env`.

---

## Step 3: Install & Deploy Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Deployed endpoints (default region `us-central1`):

- `GET  /verifyMagicLink?host=ID&token=HASH`
- `POST /updateUnavailableDates`
- `POST /sendMagicLinkBatch` (requires `Authorization: Bearer <ADMIN_API_SECRET>`)

---

## Step 4: Seed the Config Document

In Firebase Console → Firestore, create:

**Collection:** `settings`  
**Document ID:** `magic_link_config`

```json
{
  "is_enabled": false,
  "audience": "test_only",
  "test_emails": ["your-email@example.com"],
  "send_day_of_month": 25
}
```

Or use the **Admin → Magic Link Unavailability Tracker** panel in the Host Finder UI (admin password required).

---

## Step 5: Add Host Emails (Live Mode Only)

For `audience: "all_active_hosts"`, each active host needs an `email` field on their Firestore document. Add via **Admin → Edit Host → Email**.

In **test mode**, host emails are ignored; all links go to `test_emails` as a single digest.

---

## Step 6: Build & Deploy Frontend

```bash
npm run build
firebase deploy --only hosting
```

Or use `./deploy.sh` to sync GitHub Pages as well.

---

## Safe Production Testing Workflow

1. Leave **`is_enabled: false`** while testing the `/availability` UI manually.
2. Set **`audience: test_only`** and add your admin emails to **`test_emails`**.
3. Click **Send Test Batch Now** in Admin (enter `ADMIN_API_SECRET` when prompted).
4. Open links from the test digest email — confirm toggles update Firestore.
5. Verify the public Host Finder hides hosts marked unavailable for **this upcoming Wednesday**.
6. When ready: set **`is_enabled: true`**, confirm **`send_day_of_month`**, switch to **`all_active_hosts`**.

The cron job **exits immediately** when:
- `is_enabled` is `false`, OR
- today's date ≠ `send_day_of_month` (unless manual override)

---

## Magic Link URL Format

```
https://tsp-host-finder-tool.web.app/availability?host=12&token=<32-char-hmac>
```

Tokens are deterministic HMACs — no token storage in Firestore required.

---

## Host Filter Behavior

The public list treats a host as unavailable when **either**:
- `available: false` (existing weekly toggle), **or**
- `unavailable_dates` contains the **upcoming Wednesday** (`getUpcomingWednesday()`, always Wednesday-specific)

Alternate-host pairing logic runs first, then date checks apply.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Availability page says "Invalid link" | Redeploy functions; confirm `MAGIC_LINK_SECRET` matches production |
| Test batch fails with 401 | Check `ADMIN_API_SECRET` matches what you enter in the admin prompt |
| No emails received | Verify SendGrid sender domain; check `test_emails` spelling |
| Host still visible after marking unavailable | Confirm date is the **upcoming Wednesday** string (`YYYY-MM-DD`) |
| Cron didn't run on the 25th | Confirm `is_enabled: true` and Cloud Scheduler billing is active |

---

## Files Changed / Added

```
public/app.helpers.js          — date helpers
public/app.js                  — filter, availability page, admin UI
public/config.js               — Cloud Functions URL + defaults
functions/                       — Cloud Functions backend
firestore.rules                  — settings collection
firebase.json                  — functions config
app.helpers.test.js            — helper unit tests
```
