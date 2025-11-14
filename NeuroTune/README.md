# NeuroTune

A full-featured music player application built with React Native and Expo. NeuroTune provides seamless music playback, playlist management, and a responsive, modern UI for music enthusiasts.

## Overview

NeuroTune is a cross-platform mobile music player featuring:
- **Music Playback**: High-quality audio streaming with intuitive controls
- **Playlist Management**: Create, edit, and manage custom playlists
- **Liked Songs**: Save your favorite tracks for quick access
- **User Uploads**: Upload and manage your own music
- **Animated UI**: Smooth transitions and responsive design
- **Search & Discovery**: Find and explore your music library

## Tech Stack

### Mobile Application (NeuroTune/)
- **Framework**: Expo with React Native
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Zustand
- **Animations**: React Native Reanimated
- **Audio**: Expo AV
- **UI Components**: React Native

### Backend API (backend/)
- **Runtime**: Node.js
- **Framework**: Express
- **Database**: MongoDB (via connection in `db.js`)
- **Image Service**: Cloudinary integration
- **Security**: Arcjet protection

## Prerequisites

- **Node.js** 16+ and npm
- **Expo CLI** (optional; `npx expo` works)
- **EAS CLI** for building (if deploying to production)
- **Android Studio** or **Xcode** for emulators (or use a physical device)

## Quick Start

### 1. Install dependencies

```bash
cd NeuroTune
npm install
```

### 2. Start the development server

```bash
npx expo start
```

### 3. Run on device or emulator

- **Expo Go** (sandbox mode): Scan the QR code with Expo Go app
- **Development Build**: Follow on-screen prompts for Android Emulator / iOS Simulator
- **Physical Device**: Scan QR code with your phone after installing Expo Go

## Running the Backend

To run the backend API locally:

```bash
cd backend
npm install
npm run start
```

The API will be available at `http://localhost:5000` (or your configured port). Ensure your mobile app is configured to connect to this URL via `NeuroTune/app/constants/api.js`.

## Project Structure

```
SongApp/
├── NeuroTune/                    # Mobile app (React Native + Expo)
│   ├── app/                      # File-based routes
│   │   ├── (tabs)/               # Tab navigation layout
│   │   │   ├── Home.jsx          # Home screen with banners & grids
│   │   │   ├── Liked.jsx         # Liked songs
│   │   │   ├── Playlists.jsx     # Playlist list
│   │   │   └── Profile.jsx       # User profile
│   │   ├── Playlists/            # Playlist detail pages
│   │   │   ├── [id].jsx          # Playlist detail
│   │   │   ├── Liked.jsx         # Liked songs screen
│   │   │   └── UserSongs.jsx     # User uploads
│   │   └── (auth)/               # Authentication screens
│   ├── components/               # Reusable UI
│   │   ├── PlayerContainer.jsx   # Bottom player widget
│   │   ├── PlaybackExpanded.jsx  # Full-screen player
│   │   ├── GradientBackground.jsx
│   │   ├── ContextMenu.jsx
│   │   └── ...
│   ├── assets/
│   │   ├── styles/               # Shared stylesheets
│   │   │   ├── playlists.styles.js
│   │   │   ├── playerContainer.styles.js
│   │   │   └── ...
│   │   ├── images/               # App assets
│   │   └── fonts/
│   ├── store/                    # Zustand stores
│   │   ├── playerStore.js        # Audio playback state
│   │   ├── authStore.js          # Auth state
│   │   └── ...
│   ├── constants/                # App constants
│   │   ├── api.js                # API endpoints
│   │   ├── colors.js
│   │   └── artwork.js
│   ├── config/                   # App configuration
│   ├── app.json                  # Expo config
│   └── package.json
│
└── backend/                      # Express API server
    ├── src/
    │   ├── server.js             # Entry point
    │   ├── config/               # Configuration
    │   │   ├── db.js
    │   │   ├── env.js
    │   │   ├── cloudinary.js
    │   │   └── arcjet.js
    │   ├── controllers/          # Route handlers
    │   │   ├── song.controller.js
    │   │   ├── user.controller.js
    │   │   └── ...
    │   ├── models/               # MongoDB schemas
    │   │   ├── song.model.js
    │   │   ├── user.model.js
    │   │   └── ...
    │   ├── routes/               # API routes
    │   │   ├── song.routes.js
    │   │   ├── auth.routes.js
    │   │   └── ...
    │   └── middleware/           # Custom middleware
    ├── package.json
    └── vercel.json
```

## Building for Production

### Android

```bash
# Preview build (for testing)
eas build --platform android --profile preview

# Production build
eas build --platform android --profile production
```

### iOS

```bash
# Production build (requires Apple Developer Account)
eas build --platform ios --profile production
```

See `eas.json` for build profile configuration.

## Key Features & Developer Notes

### Audio Routing (Android)
The app uses `expo-av` for audio playback. If audio unexpectedly routes to the earpiece on Android:
- Check `store/playerStore.js`
- Ensure `playThroughEarpieceAndroid: false` in `Audio.setAudioModeAsync()`

### Animated Headers & Stacking
Many playlist screens feature collapsing headers with `FlatList` below. To prevent overlap:
- Adjust `contentContainerStyle.paddingTop` (typically tied to `HEADER_MAX`)
- Raise `zIndex`/`elevation` on fixed elements to keep them above scroll content
- Use `useSafeAreaInsets()` from `react-native-safe-area-context` for safe areas

### Styling Best Practices
- Shared styles live in `assets/styles/` (e.g., `playlists.styles.js`)
- When modifying shared styles, prefer adding screen-specific overrides to avoid regressions
- Keep theme colors in `constants/colors.js` for consistency

### Player Container
The bottom mini player uses `react-native-safe-area-context`. When modifying:
- Check `insets.bottom` to avoid gesture bars or notches
- Use `miniArtPlaceholder` size for artwork scaling without changing container height

## Common Commands

```bash
# Development
npx expo start                           # Start dev server
npm install                              # Install dependencies
npm run dev                              # Alternative dev command

# Backend
cd backend && npm run start              # Start API server

# Building
eas build --platform android             # Build Android
eas build --platform ios                 # Build iOS

# Cleaning
npm run reset-project                    # Reset to fresh state (Expo)
```

## Environment Variables

### Backend (backend/src/config/env.js)
Required environment variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing key
- `CLOUDINARY_NAME` - Cloudinary account name
- `CLOUDINARY_KEY` - Cloudinary API key
- `CLOUDINARY_SECRET` - Cloudinary API secret
- `ARCJET_KEY` - Arcjet API key (optional, for rate limiting)

### Mobile App (NeuroTune/app/constants/api.js)
Configure your backend API endpoint here.

## Deployment

### Mobile
Deploy builds via Expo Application Services (EAS):
```bash
eas submit --platform android
```

### Backend
The project includes `vercel.json` for Vercel deployment. Deploy via:
```bash
npm install -g vercel
vercel
```

## Contributing

1. **Code Style**: Keep changes localized to relevant screens/styles
2. **Testing**: Always test on both Android and iOS simulators/devices
3. **Native Modules**: If adding new packages with native code:
   - Update `app.json` and `eas.json`
   - Document new environment variables
   - Test with `eas build --platform android`
4. **Performance**: Profile and optimize animations and FlatList rendering

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Audio plays through earpiece (Android) | Set `playThroughEarpieceAndroid: false` in `playerStore.js` |
| FlatList content covered by header | Increase `contentContainerStyle.paddingTop` |
| Overlay/gradient covers play button | Raise `zIndex`/`elevation` or reorder render in `GradientBackground.jsx` |
| Build fails on EAS | Check `eas.json` profiles and environment variables |

## Support & License

This project is maintained by the NeuroTune team. For issues or feature requests, open an issue in the project tracker.

**License**: Proprietary (add LICENSE file if open-sourcing)

---

**Last Updated**: November 2025  
**Status**: Active Development
