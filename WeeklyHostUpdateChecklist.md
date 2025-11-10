## Weekly Host Update Checklist

Use this playbook whenever the host availability list changes. It keeps the static app and users’ cached data in sync, avoids stale views, and documents the manual verification steps.

### 1. Update Default Host Data
- Edit `app.js` and adjust the `defaultHosts` array so the availability reflects the upcoming week.
- Ensure the backup copies (`app.js.backup`, `app.js.bak`) are updated to match if they are used as references.

### 2. Bump the Data Version (Critical for cache refresh)
- In `app.js`, update the fallback string in `DATA_VERSION` (near the `getInitialHosts` function).
- In `config.js`, update `CONFIG.DATA_VERSION` to the same value.  
- Use the current Monday’s date (e.g., `2025-11-10`) so every visitor detects a new build and clears their cached host list automatically.

### 3. Deploy / Publish
- Run the normal build and deployment pipeline.
- Confirm the deployment host (Netlify/Vercel/S3/etc.) doesn’t have stale cache; purge the deploy if needed.

### 4. Verify the Live Site
- Open the site in a fresh incognito window **after deployment**. You should see the new host availability without using the admin dialog.
- Optionally, clear `localStorage` (`Application` tab → Local Storage → right-click → `Clear`, or run `localStorage.clear()` in the console) to simulate a first-time visitor.

### 5. Communicate (Optional but helpful)
- If you renamed the external URL or changed the workflow, drop a note in the newsletter or release notes.
- Remind internal helpers that the data version bump is mandatory; without it, some users will continue to see outdated hosts.

### Troubleshooting Stale Data
- Confirm both `DATA_VERSION` values match exactly.
- Ask the affected user which browser/device they use; very old Safari/iOS versions may cling to cached JS and need a reload.
- Check the deployment service for lingering cached assets or service-worker copies (none used today, but re-verify if the build changes).

Following this checklist ensures users always see the freshest collection host list without manual “hard refresh” instructions.

