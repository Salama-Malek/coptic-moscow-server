# Notification Sounds

Replace `bell.mp3` with the actual church bell sound before release.

## Requirements
- **Duration:** Under 30 seconds (required for iOS Critical Alerts compatibility)
- **Format:** MP3 for Android, CAF for iOS

## Generating the iOS CAF file

On macOS, run:
```bash
afconvert -f caff -d LEI16 bell.mp3 bell.caf
```

Then place `bell.caf` alongside `bell.mp3` in this directory.

## Expo configuration

The sound is registered in `app.json` under the `expo-notifications` plugin:
```json
["expo-notifications", { "sounds": ["./assets/sounds/bell.mp3"] }]
```

For iOS, also add `bell.caf` to the sounds array after generating it.
