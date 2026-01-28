# Google OAuth2 Login Setup Guide

This guide will help you set up Google Sign-In for your Ride Sharing Application.

## Prerequisites

- A Google Cloud Platform (GCP) account
- Access to Google Cloud Console

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" or "Google Identity Services"
   - Click "Enable"

4. Create OAuth 2.0 Client ID:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - If prompted, configure the OAuth consent screen:
     - Choose "External" (unless you have a Google Workspace account)
     - Fill in the required information (App name, User support email, Developer contact email)
     - Add your email to test users (if in testing mode)
     - Save and continue through the scopes and test users sections
   
5. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: "Ride Sharing App" (or any name you prefer)
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for local frontend development)
     - `http://localhost:3000` (if using a different port)
     - `https://smartrideapp.online` (your production domain)
     - `https://www.smartrideapp.online`
   - Authorized redirect URIs:
     - `http://localhost:5173` (for local)
     - `https://smartrideapp.online` (for production)
   - Click "Create"

6. Copy the **Client ID** (it looks like: `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`)

## Step 2: Configure Backend

1. Open `src/main/resources/application.properties`
2. Replace `YOUR_GOOGLE_CLIENT_ID_HERE` with your actual Google Client ID:
   ```properties
   google.client.id=your-actual-google-client-id-here.apps.googleusercontent.com
   ```

## Step 3: Configure Frontend

1. Open `frontend/src/pages/Login.jsx`
2. Find the line with `client_id: 'YOUR_GOOGLE_CLIENT_ID_HERE'`
3. Replace it with your actual Google Client ID:
   ```javascript
   client_id: 'your-actual-google-client-id-here.apps.googleusercontent.com',
   ```

## Step 4: Test the Integration

1. Start your backend server:
   ```bash
   mvn spring-boot:run
   ```

2. Start your frontend server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to the login page
4. Click the "Sign in with Google" button
5. Select a Google account
6. Grant permissions when prompted
7. You should be redirected to your dashboard upon successful authentication

## How It Works

### Backend Flow:
1. Frontend sends Google ID token to `/api/auth/google-login`
2. Backend verifies the token with Google's servers
3. Backend extracts user information (email, name, Google ID)
4. Backend checks if user exists:
   - If new: Creates user account with default PASSENGER role
   - If existing: Updates provider info and logs them in
5. Backend generates JWT token
6. Frontend receives token and stores it for authenticated requests

### Frontend Flow:
1. User clicks "Sign in with Google" button
2. Google Identity Services opens popup/redirect
3. User selects account and grants permission
4. Google returns ID token
5. Frontend sends token to backend `/api/auth/google-login`
6. Frontend receives JWT token and user info
7. User is redirected to appropriate dashboard based on role

## Important Notes

1. **Security**: Never commit your Google Client ID to public repositories in production. Consider using environment variables.

2. **User Roles**: By default, Google OAuth users are created as PASSENGERS. If a user wants to be a DRIVER, they can:
   - Register normally as a driver
   - Or you can modify the code to allow role selection during Google sign-in

3. **Account Linking**: If a user already has an account with email/password and then signs in with Google using the same email, their account will be automatically linked to Google OAuth.

4. **Password Reset**: Users who sign in with Google don't need to set/reset passwords. They'll always use Google authentication.

## Troubleshooting

### "Invalid Google token" error:
- Check that your Client ID matches in both frontend and backend
- Ensure the Google Client ID is correct in `application.properties`
- Verify the token hasn't expired (they expire after 1 hour)

### "Redirect URI mismatch" error:
- Ensure all your redirect URIs are added in Google Cloud Console
- Check that the origin URL matches exactly (including http/https and port)

### Button not appearing:
- Check browser console for errors
- Ensure the Google Identity Services script is loaded in `index.html`
- Verify your Client ID is correct in the frontend code

### Token verification fails:
- Ensure Google+ API is enabled in Google Cloud Console
- Check that your backend can reach Google's servers (no firewall blocking)
- Verify the Client ID in `application.properties` is correct

## Environment Variables (Recommended for Production)

For better security, use environment variables instead of hardcoding:

**Backend (`application.properties`):**
```properties
google.client.id=${GOOGLE_CLIENT_ID}
```

**Frontend (`.env` file):**
```env
VITE_GOOGLE_CLIENT_ID=your-client-id-here
```

Then update `Login.jsx`:
```javascript
client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
```

## Support

If you encounter issues, check:
1. Google Cloud Console for API usage and errors
2. Backend logs for authentication errors
3. Browser console for frontend errors
4. Network tab to see API requests/responses