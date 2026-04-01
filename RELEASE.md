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
- Update user-visible version in `app.json` (`expo.version`) when shipping a public release.
