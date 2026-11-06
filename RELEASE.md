# EEA Enterprises Mobile Release Guide

This project is ready to ship with Expo + EAS.

## One-time Setup

1. Install dependencies:
```bash
npm install
```
2. Install and login to EAS:
```bash
npm install -g eas-cli
eas login
```
3. Confirm project configuration:
```bash
eas build:configure
```

## Store Identifiers

These are already configured in `app.json`:

- iOS bundle ID: `com.eeaenterprises.app`
- Android package: `com.eeaenterprises.app`

If these IDs are already used in your developer accounts, keep them. Otherwise change them before first store release.

## Build Production Binaries

Run cloud builds:

```bash
npm run build:all
```

Or per platform:

```bash
npm run build:ios
npm run build:android
```

## Apple App Store Submission

1. Join Apple Developer Program.
2. Create app in App Store Connect.
3. Update `eas.json` submit profile `production-ios`:
- `appleId`
- `ascAppId`
- `appleTeamId`
4. Submit:
```bash
eas submit --platform ios --profile production-ios
```

## Google Play Submission

1. Create Google Play Console app.
2. Create a Google Cloud service account with Play Android Developer API access.
3. Download JSON key and save as `google-services-key.json` in project root.
4. Submit:
```bash
eas submit --platform android --profile production-android
```

## Required Store Assets (Prepare Before Submission)

- App icon 1024x1024
- Screenshots:
- iPhone 6.7" and 6.5" recommended for iOS
- Phone screenshots for Android
- Privacy policy URL
- App description, keywords, support contact

## Versioning for Updates

- iOS build number auto-increments via EAS production profile.
- Android version code auto-increments via EAS production profile.
- Update the user-visible version in `app.json` (`expo.version`) and `package.json` when shipping a public release.
- The runtime version follows `expo.version`. SDK 58 uses version 1.1.0, so build and distribute new binaries before publishing SDK 58 updates; existing 1.0.0 binaries cannot receive them.

## Connection Recovery Checks

Before releasing, verify on iOS and Android:

- Open the app without a connection and confirm the error screen appears.
- Restore connectivity and tap Retry; the website should load again.
- Confirm Contact Us remains available while loading and on the error screen, and opens the website's Contact Us page.
- Interrupt loading the Contact Us page, restore connectivity, and tap Contact Us again; the page should reload.
- Navigate to another page, interrupt connectivity, and retry; the app should reload that page.
- Confirm loading shows a small indicator without fading the page or blocking scrolling and Contact Us.
- On a slow connection, confirm the indicator clears within 15 seconds while the page continues loading; genuine load failures should still show the retry screen.
- Open Contact Us on iPhone and Android; embedded widgets should load without opening another app or showing an Unavailable alert.
- Tap email, phone, and WhatsApp links; confirm they open the corresponding app or display a useful message with another way to make contact if no app is installed.
