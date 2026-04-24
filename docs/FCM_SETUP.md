# Firebase Cloud Messaging (FCM) Setup

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project**
3. Project name: `coptic-moscow`
4. Disable Google Analytics (not needed)
5. Click **Create project**

## Step 2: Enable Cloud Messaging

1. In the Firebase project → **Project settings** → **Cloud Messaging** tab
2. Cloud Messaging API (V1) should be enabled by default
3. If not, click **Manage API in Google Cloud Console** and enable it

## Step 3: Generate Service Account JSON

1. In Firebase project → **Project settings** → **Service accounts** tab
2. Click **Generate new private key**
3. Download the JSON file
4. Rename to `firebase-service-account.json`
5. **Never commit this file to git** — place it on the server at `/home/<user>/private/firebase-service-account.json`

## Step 4: Add Android App

1. In Firebase project → **Project settings** → **General** tab
2. Click **Add app** → Android
3. Package name: `church.copticmoscow.app`
4. App nickname: `Coptic Moscow`
5. Download `google-services.json`
6. Place it at `/mobile/google-services.json`

## Step 5: Add iOS App

1. Click **Add app** → iOS
2. Bundle ID: `church.copticmoscow.app`
3. App nickname: `Coptic Moscow`
4. Download `GoogleService-Info.plist`
5. Place it at `/mobile/ios/copticmoscow/GoogleService-Info.plist`
   (This path is created when you run `npx expo prebuild`)

## Step 6: Configure Expo

The `app.json` is already configured with the correct bundle identifiers.

For production builds, you'll need to run:
```bash
cd mobile
npx expo prebuild
```

This generates the native `ios/` and `android/` directories where you place the Firebase config files.

## Step 7: Build with EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in
eas login

# Configure
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## Important Notes

- FCM tokens are device-specific and expire. The app sends a heartbeat on each launch to keep tokens fresh.
- Stale tokens (not seen for 60+ days) are cleaned up by the daily cron job.
- Invalid tokens are automatically removed when FCM reports `messaging/invalid-registration-token` or `messaging/registration-token-not-registered`.
