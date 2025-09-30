# Google Maps API Setup Instructions

## Step 1: Get a Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Geocoding API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Geocoding API"
   - Click on it and press "Enable"
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
   - **HTTP referrers**: Add your domain(s):
     - `https://nicunursekatie.github.io/sandwichprojectcollectionsites/*`
     - `http://localhost:*` (for local testing)
   - **API restrictions**: Select "Restrict key" and choose "Geocoding API"

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
- The Geocoding API is enabled in your Google Cloud project
- Your API key has the correct restrictions
- Your domain is in the allowed referrers list

**"OVER_QUERY_LIMIT" error**: You've exceeded the free tier limits
- Check your usage in Google Cloud Console
- Consider adding billing if needed

**Still getting zero results**: The API includes geographic bounds for Atlanta area, but you can try addresses outside Atlanta too.