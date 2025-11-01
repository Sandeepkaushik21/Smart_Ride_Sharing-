# LocationIQ API Setup Guide

## Quick Setup Steps

1. **Sign up for LocationIQ**
   - Visit: https://locationiq.com/
   - Create a free account (5,000 requests/day)

2. **Get your API Key**
   - After signing up, go to your dashboard
   - Copy your API key

3. **Configure the API Key**
   - In the `frontend` folder, create a file named `.env.local`
   - Add this line (replace with your actual API key):
     ```
     VITE_LOCATIONIQ_API_KEY=your_actual_api_key_here
     ```

4. **Restart the Development Server**
   - Stop your Vite dev server (Ctrl+C)
   - Start it again: `npm run dev`
   - The LocationIQ integration will now work!

## What It Does

When users search for cities (like "Chennai" or "Mumbai"), the app will automatically:
- Use LocationIQ API to find nearby popular locations
- Show 4 relevant places (Railway Station, Airport, City Center, etc.)
- Users can click these to quickly select locations

## Without API Key

If you don't set up the API key, the app will use predefined locations for major cities as a fallback. The functionality will still work, but won't be as accurate.

## Files Modified

- `frontend/src/services/locationService.js` - Contains the LocationIQ integration
- `frontend/src/components/CityAutocomplete.jsx` - Uses the location service
- `frontend/.env.example` - Example environment file (copy to .env.local)

