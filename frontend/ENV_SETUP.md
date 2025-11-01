# Quick Setup: LocationIQ API Key

## Steps:

1. **Get API Key**
   - Go to: https://locationiq.com/
   - Sign up (free: 5,000 requests/day)
   - Copy your API key from dashboard

2. **Create .env.local file**
   - In the `frontend` folder, create a new file named `.env.local`
   - Add this line (replace with your actual key):
     ```
     VITE_LOCATIONIQ_API_KEY=your_api_key_here
     ```

3. **Restart Server**
   - Stop dev server (Ctrl+C)
   - Start again: `npm run dev`

That's it! LocationIQ will now work.

