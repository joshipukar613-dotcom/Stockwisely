# Google OAuth 2.0 Setup Guide

This guide will walk you through creating Google OAuth 2.0 credentials to enable "Sign in with Google" functionality for your application.

## 1. Create a Google Cloud Project

If you don't have one already, create a new project in the [Google Cloud Console](https://console.cloud.google.com/projectcreate).

- **Project Name**: Choose a descriptive name (e.g., `Stock Wisely App`).
- **Organization**: Select your organization or leave it as "No organization".

## 2. Enable the "Google People API"

Your application needs access to this API to retrieve user profile information (like name and email) after they sign in.

1.  Navigate to the [API Library](https://console.cloud.google.com/apis/library).
2.  Search for **"Google People API"** and select it.
3.  Click **Enable**.

## 3. Configure the OAuth Consent Screen

This is the screen users will see when they are asked to grant your application access to their Google account.

1.  Go to the [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent) page.
2.  Choose the **External** user type and click **Create**.
3.  Fill in the required application details:
    - **App name**: The name of your application (e.g., `Stock Wisely`).
    - **User support email**: Your email address for user support.
    - **Developer contact information**: Your email address.
4.  Click **Save and Continue** through the "Scopes" and "Test Users" sections. You can configure these later if needed.
5.  On the "Summary" page, click **Back to Dashboard**.
6.  Click **Publish App** and confirm to make it available to any Google user.

## 4. Create OAuth 2.0 Credentials

This is where you will get your Client ID and Client Secret.

1.  Go to the [Credentials](https://console.cloud.google.com/apis/credentials) page.
2.  Click **+ Create Credentials** and select **OAuth client ID**.
3.  Configure the client ID:
    - **Application type**: Select **Web application**.
    - **Name**: Give it a name (e.g., `Stock Wisely Web Client`).

4.  **Configure the URIs**:
    - Under **Authorized JavaScript origins**, add your frontend's URL:
        - `http://localhost:3001`
    - Under **Authorized redirect URIs**, add your backend's Google callback URL:
        - `http://localhost:5000/api/auth/google/callback`

5.  Click **Create**.

## 5. Get Your Credentials

A dialog box will appear showing your **Client ID** and **Client Secret**. Copy these values. You will need them in the next step.

## 6. Update Your Environment File

Open the `.env` file in your `backend` directory and update the following lines with the credentials you just copied:

```env
# backend/.env

# ... other variables

# Google OAuth
GOOGLE_CLIENT_ID=paste-your-client-id-here
GOOGLE_CLIENT_SECRET=paste-your-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# ... other variables
```

## 7. Restart Your Backend Server

After updating the `.env` file, you **must** restart your backend server for the changes to take effect.

1.  Go to the terminal where your backend server is running.
2.  Press `CTRL + C` to stop it.
3.  Run `npm start` to start it again.

After completing these steps, the "Sign in with Google" button should now work correctly.