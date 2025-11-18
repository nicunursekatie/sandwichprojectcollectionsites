# Deployment Guide

## Important: Dual Hosting Architecture

This app is currently hosted in **two places**:
1. **Firebase Hosting** (primary): https://tsp-host-finder-tool.web.app
2. **GitHub Pages** (legacy): https://nicunursekatie.github.io/sandwichprojectcollectionsites/

Both sites use the **same Firebase Firestore database** for host data.

---

## Which Files to Edit

### ⚠️ ALWAYS edit files in the `public/` directory:

```
public/
├── app.js           # Main React application
├── app.helpers.js   # Helper functions
├── config.js        # Configuration
├── utils.js         # Utility functions
├── index.html       # HTML template
└── styles.css       # Styles
```

### ❌ DO NOT directly edit files in the root directory:
- `app.js` (root) - auto-synced from `public/app.js`
- `index.html` (root) - auto-synced from `public/index.html`

---

## How to Deploy

### Automatic Deployment (Recommended)

Use the deployment script to update both sites:

```bash
./deploy.sh
```

This script:
1. Deploys to Firebase Hosting
2. Copies `public/app.js` → `app.js` (root)
3. Copies `public/index.html` → `index.html` (root)
4. Commits and pushes to GitHub (which deploys to GitHub Pages)

### Manual Deployment

If you need to deploy manually:

#### Firebase Only:
```bash
firebase deploy --only hosting
```

#### GitHub Pages Only:
```bash
cp public/app.js app.js
cp public/index.html index.html
git add app.js index.html
git commit -m "Update GitHub Pages"
git push
```

---

## Cache Busting

When you make changes to JavaScript files, **update the version number** in `public/index.html`:

```html
<!-- Change the version parameter to force browsers to reload -->
<script src="app.js?v=20251118b"></script>
```

Increment the version (e.g., `20251118b` → `20251118c` or `20251119a` for a new day).

---

## Firebase Configuration

### Firestore Database

Host data is stored in Firestore:
- Collection: `hosts`
- Each document ID matches the host's numeric ID

### Security Rules

Located in `firestore.rules`:
- `hosts` collection: Full read/write access
- `feedback` collection: Write-only for user submissions

To deploy security rules:
```bash
firebase deploy --only firestore:rules
```

---

## Migration Plan: Consolidating to Firebase Only

**Goal**: Eventually retire GitHub Pages and use only Firebase Hosting.

### Why Firebase?
- Firestore database integration
- Better analytics
- Custom domain support
- Faster deployments

### Migration Steps (Future)

1. **Update DNS/Links** (when ready):
   - Point all external links to Firebase URL
   - Set up custom domain if needed

2. **Archive GitHub Pages**:
   - Remove `app.js` and `index.html` from root
   - Update `deploy.sh` to only deploy to Firebase
   - Add redirect in GitHub Pages to Firebase URL

3. **Clean up**:
   - Remove dual-hosting logic from deployment script
   - Update this documentation

---

## Admin Panel

Access the admin panel to manage hosts:
1. Click the TSP logo 3 times quickly
2. Use the admin interface to:
   - Add/edit/delete hosts
   - Update availability
   - Export host data

Changes made in the admin panel are saved to Firestore and appear on both sites immediately.

---

## Common Issues

### Changes not appearing on GitHub Pages
- Make sure you ran `./deploy.sh` (not just `firebase deploy`)
- Check that root `app.js` and `index.html` were updated
- GitHub Pages can take 1-2 minutes to rebuild

### Changes not appearing on Firebase
- Make sure you deployed: `firebase deploy --only hosting`
- Check Firebase console for deployment status
- Clear browser cache (version number should force this)

### Hosts data out of sync
- Both sites read from the same Firestore database
- If you see different data, check browser cache
- Admin panel updates are instant in Firestore

---

## Questions?

Contact the project maintainer or check:
- Firebase Console: https://console.firebase.google.com/project/tsp-host-finder-tool
- GitHub Repository: https://github.com/nicunursekatie/sandwichprojectcollectionsites
