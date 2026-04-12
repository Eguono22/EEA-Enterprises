# EEA Enterprises Mobile App

A cross-platform mobile application for [EEA Enterprises](https://eea-enterprises.com/) built with [Expo](https://expo.dev/) (React Native). The app wraps the EEA Enterprises website in a native mobile shell and is ready to publish to both the **Apple App Store** and **Google Play Store**.

---

## Features

- 📱 Native iOS & Android app powered by Expo / React Native
- 🌐 Full website experience via embedded WebView
- ⬅️ Android hardware back-button navigation support
- ⏳ Loading indicator while pages load
- ⚠️ Offline / error screen with retry button
- 🎨 Branded splash screen and app icon (EEA navy blue)

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 or later |
| npm | 9 or later |
| Expo CLI | `npm install -g expo-cli` |
| EAS CLI | `npm install -g eas-cli` |
| Expo account | [expo.dev](https://expo.dev/signup) (free) |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run in development

```bash
# Start the Expo dev server
npm start

# Open on a physical device using the Expo Go app, or:
npm run ios      # Requires macOS + Xcode
npm run android  # Requires Android Studio
```

---

## Building for Production

Builds are handled by **EAS Build** (Expo's cloud build service). No local Xcode or Android Studio required.

### 1. Configure EAS

```bash
# Log in to your Expo account
eas login

# Initialize EAS in the project (one-time setup)
eas build:configure
```

### 2. Update `eas.json`

Edit `eas.json` and fill in your Apple and Google credentials:

```json
"submit": {
  "production-ios": {
    "ios": {
      "appleId": "your-apple-id@icloud.com",
      "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
      "appleTeamId": "YOUR_APPLE_TEAM_ID"
    }
  },
  "production-android": {
    "android": {
      "serviceAccountKeyPath": "./google-services-key.json",
      "track": "production"
    }
  }
}
```

### 3. Build

```bash
# Build for both platforms (cloud)
npm run build:all

# Or build for a single platform
npm run build:ios
npm run build:android
```

---

## Publishing to the App Stores

### Apple App Store

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year).
2. Create an app record in [App Store Connect](https://appstoreconnect.apple.com/).
3. Run the EAS submit command:

```bash
eas submit --platform ios --profile production-ios
```

EAS will prompt for credentials and upload the `.ipa` automatically.

### Google Play Store

1. Create a [Google Play Developer account](https://play.google.com/console/) ($25 one-time fee).
2. Create a new app in the Google Play Console.
3. Download a Google Play API service account JSON key and save it as `google-services-key.json` in the project root (this file is **git-ignored**).
4. Run the EAS submit command:

```bash
eas submit --platform android --profile production-android
```

---

## Project Structure

```
eea-enterprises/
├── app/
│   ├── _layout.jsx          # Root navigation layout (header styling)
│   └── index.jsx            # Main WebView screen
├── assets/
│   └── images/
│       ├── icon.png         # App icon (1024×1024)
│       ├── adaptive-icon.png # Android adaptive icon (1024×1024)
│       ├── splash-icon.png  # Splash screen image (512×512)
│       └── favicon.png      # Web favicon (32×32)
├── app.json                 # Expo app configuration
├── eas.json                 # EAS Build / Submit configuration
├── babel.config.js          # Babel configuration
└── package.json             # Dependencies and scripts
```

---

## App Configuration

Key settings in `app.json`:

| Field | Value |
|-------|-------|
| App Name | EEA Enterprises |
| iOS Bundle ID | `com.eeaenterprises.app` |
| Android Package | `com.eeaenterprises.app` |
| Target URL | `https://eea-enterprises.com/` |
| Orientation | Portrait |

---

## Customizing the App Icon & Splash Screen

Replace the placeholder images in `assets/images/` with your branded artwork:

- `icon.png` — 1024 × 1024 px, no transparency, no rounded corners (Apple adds them automatically)
- `adaptive-icon.png` — 1024 × 1024 px foreground layer for Android adaptive icons
- `splash-icon.png` — centred logo displayed on the splash screen
- `favicon.png` — 32 × 32 px for the web build

After replacing assets, rebuild the app with `npm run build:all`.

For a full production checklist, see `RELEASE.md`.

---

## Monitoring Setup

This app includes Sentry-based crash reporting and basic event tracking for the native shell.

1. Copy `.env.example` to `.env`
2. Set `EXPO_PUBLIC_SENTRY_DSN` to your Sentry project DSN
3. Optionally adjust:

```bash
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
```

If you want source maps uploaded during EAS builds, also set these environment variables in your shell or as EAS secrets:

```bash
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

Tracked events currently include:

- app session start
- home screen view
- WebView navigation changes
- WebView load start / finish
- retry taps
- WebView load and HTTP failures

To verify locally, start the app with `npm start` after setting the DSN and confirm events appear in Sentry.

