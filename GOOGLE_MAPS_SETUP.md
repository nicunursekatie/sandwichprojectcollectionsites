# Google Maps API Setup Instructions

## Step 1: Get a Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the required APIs:
   - Go to "APIs & Services" > "Library"
   - Search for and enable **"Geocoding API"**
   - Search for and enable **"Maps JavaScript API"** (needed for the map view)
4. Create an API key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API key"
   - Copy the generated API key

## Step 2: Configure Your API Key

### Option A: Direct editing (for testing)
1. Open `config.js`
2. Replace `'YOUR_API_KEY_HERE'` with your actual API key
3. **Important**: Don't commit this file with your real API key to a public repository

### Option B: Local config file (recommended)
1. Create a file called `config.local.js` (this file is ignored by git)
2. Copy the contents of `config.js` into `config.local.js`
3. Replace `'YOUR_API_KEY_HERE'` with your actual API key in `config.local.js`
4. Update `index.html` to load `config.local.js` instead of `config.js`

## Step 3: Secure Your API Key (Important!)

1. In Google Cloud Console, go to your API key settings
2. Add restrictions:
   - **Application restrictions**: Select "None"
     - ⚠️ **Note**: The Geocoding API doesn't support HTTP referrer restrictions when called from JavaScript
   - **API restrictions**: Select "Restrict key" and choose:
     - **Geocoding API** (for address lookup)
     - **Maps JavaScript API** (for the interactive map view)
     - ✅ **This is the main security protection** - your key can only be used for these specific APIs

## Step 4: Pricing Information

- Google Maps Geocoding API includes $200/month free credit
- After that, it's $5 per 1000 requests
- For your sandwich app usage, you'll likely stay within the free tier
- Monitor usage at: [Google Cloud Console > APIs & Services > Quotas](https://console.cloud.google.com/apis/api/geocoding-backend.googleapis.com/quotas)

## Benefits of Google Maps API vs OpenStreetMap

✅ **Better accuracy** - Especially for US addresses  
✅ **Better parsing** - Handles various address formats  
✅ **Faster response times**  
✅ **Better error handling**  
✅ **Atlanta-area optimization** with geographic bounds  

## Troubleshooting

**"API key not configured" error**: Make sure you've replaced `YOUR_API_KEY_HERE` with your actual key

**"REQUEST_DENIED" error**: Check that:
- Both Geocoding API and Maps JavaScript API are enabled in your Google Cloud project
- Application restrictions are set to "None" (Geocoding API doesn't support referrer restrictions)
- API restrictions include both "Geocoding API" and "Maps JavaScript API"
- Billing is set up in Google Cloud Console

**"OVER_QUERY_LIMIT" error**: You've exceeded the free tier limits
- Check your usage in Google Cloud Console
- Consider adding billing if needed

**Still getting zero results**: The API includes geographic bounds for Atlanta area, but you can try addresses outside Atlanta too.