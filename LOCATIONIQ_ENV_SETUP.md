# Step-by-Step Guide: Adding LocationIQ API Key to .env File

## Step 1: Get Your LocationIQ API Key

1. Go to https://locationiq.com/
2. Click **"Sign Up"** or **"Login"** if you already have an account
3. After signing in, you'll see your dashboard
4. Find your **API Key** (it looks like: `pk.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
5. **Copy the API key** - you'll need it in the next steps

---

## Step 2: Navigate to Frontend Folder

1. Open your project folder: `RSA_Infosys`
2. Go inside the `frontend` folder
3. You should see files like `package.json`, `vite.config.js`, etc.

---

## Step 3: Create .env.local File

### Option A: Using VS Code / Code Editor
1. Right-click in the `frontend` folder
2. Select **"New File"** or **"New Text Document"**
3. Name it exactly: `.env.local` (including the dot at the start)
4. Press Enter to create

### Option B: Using Windows File Explorer
1. Open the `frontend` folder in File Explorer
2. Click **"New"** → **"Text Document"**
3. Rename it to `.env.local` (you may need to enable "Show file extensions" in View settings)
4. **Important**: When renaming, remove `.txt` extension and keep only `.env.local`

### Option C: Using Command Line / Terminal
1. Open terminal/command prompt
2. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
3. Create the file:
   ```bash
   # Windows PowerShell:
   New-Item -Path .env.local -ItemType File
   
   # Windows CMD:
   echo. > .env.local
   
   # Git Bash / Linux / Mac:
   touch .env.local
   ```

---

## Step 4: Add API Key to .env.local

1. Open the `.env.local` file you just created
2. Add this line (replace `your_actual_api_key_here` with the key you copied):
   ```
   VITE_LOCATIONIQ_API_KEY=your_actual_api_key_here
   ```
3. **Example** (what it should look like):
   ```
   VITE_LOCATIONIQ_API_KEY=pk.1234567890abcdef1234567890abcdef
   ```
4. **Important**: 
   - No spaces around the `=` sign
   - No quotes needed
   - No trailing spaces
   - Save the file (Ctrl+S)

---

## Step 5: Verify the File

Your `.env.local` file should look exactly like this:

```
VITE_LOCATIONIQ_API_KEY=pk.your_actual_api_key_here
```

**Make sure:**
- ✅ File name is `.env.local` (starts with a dot)
- ✅ Located in the `frontend` folder (not the root project folder)
- ✅ Contains the exact variable name: `VITE_LOCATIONIQ_API_KEY`
- ✅ Your API key is after the `=` sign

---

## Step 6: Restart Development Server

1. **Stop** your current Vite dev server (press `Ctrl+C` in the terminal where it's running)
2. **Start** it again:
   ```bash
   cd frontend
   npm run dev
   ```
3. The LocationIQ integration will now work!

---

## Step 7: Test It

1. Go to your application: http://localhost:5173
2. Login and go to Driver or Passenger Dashboard
3. Try typing a city name like "Chennai" or "Mumbai"
4. You should see 4 nearby locations appear below the input field
5. If locations appear, **it's working!** ✅

---

## Troubleshooting

### Problem: Locations not showing
- Check if `.env.local` file exists in the `frontend` folder
- Verify the API key is correct (copy-paste again)
- Make sure you restarted the dev server after creating the file
- Check browser console (F12) for any error messages

### Problem: Can't create .env.local file
- Some editors require enabling "Show hidden files"
- Try creating it with a different name first, then rename it
- Or use terminal/command line to create it

### Problem: API key not working
- Verify you copied the full API key (it's long)
- Make sure there are no extra spaces
- Check your LocationIQ dashboard to see if you've exceeded the free tier limit (5,000 requests/day)

---

## Important Notes

- ✅ The `.env.local` file should NOT be committed to git (it's already in .gitignore)
- ✅ Never share your API key publicly
- ✅ Free tier: 5,000 requests per day
- ✅ The file must be named exactly `.env.local` (with the dot)

---

## Quick Checklist

- [ ] Got API key from LocationIQ.com
- [ ] Created `.env.local` file in `frontend` folder
- [ ] Added `VITE_LOCATIONIQ_API_KEY=your_key` to the file
- [ ] Saved the file
- [ ] Restarted dev server
- [ ] Tested in the application

Done! 🎉

