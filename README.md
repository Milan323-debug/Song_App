# NeuroTune - Music Player Application

A full-featured cross-platform music player built with React Native (Expo) and Express.js. NeuroTune combines a modern mobile interface with a robust backend API, offering seamless music playback, playlist management, and cloud integration.

## 🎵 Project Overview

NeuroTune is a complete music streaming solution featuring:

### Mobile App Features
- High-quality audio playback with intuitive controls
- Create and manage custom playlists
- Like and save favorite tracks
- Upload and manage your own music
- Animated UI with smooth transitions
- Search and discover your music library
- Dynamic color theming based on album artwork
- Bottom mini-player and expanded playback view

### Backend Features
- JWT-based authentication and user management
- RESTful API for music and playlist operations
- Cloudinary integration for media storage
- Dominant color extraction for dynamic UI themes
- Arcjet security and rate limiting
- MongoDB database for persistent storage
- Notification system for user updates

## 📁 Repository Structure

```
SongApp/
├── NeuroTune/                    # React Native + Expo Mobile App
│   ├── app/                      # File-based routing (Expo Router)
│   │   ├── (tabs)/               # Tab-based navigation
│   │   │   ├── Home.jsx          # Home screen with hero banners
│   │   │   ├── Liked.jsx         # Liked songs screen
│   │   │   ├── Playlists.jsx     # Playlist listing
│   │   │   └── Profile.jsx       # User profile
│   │   ├── Playlists/            # Playlist detail screens
│   │   │   ├── [id].jsx          # Playlist detail view
│   │   │   ├── Liked.jsx         # Liked songs view
│   │   │   └── UserSongs.jsx     # User uploads view
│   │   └── (auth)/               # Authentication screens
│   ├── components/               # Reusable React components
│   │   ├── PlayerContainer.jsx   # Bottom mini player
│   │   ├── PlaybackExpanded.jsx  # Full-screen player
│   │   ├── GradientBackground.jsx
│   │   └── ...
│   ├── assets/
│   │   ├── styles/               # Shared stylesheets
│   │   ├── images/               # App assets and icons
│   │   └── fonts/                # Custom fonts
│   ├── store/                    # Zustand state management
│   │   ├── playerStore.js        # Audio playback state
│   │   ├── authStore.js          # Authentication state
│   │   └── ...
│   ├── constants/                # App constants and config
│   ├── app.json                  # Expo configuration
│   ├── eas.json                  # EAS build configuration
│   ├── package.json
│   └── README.md
│
├── backend/                      # Express.js API Server
│   ├── src/
│   │   ├── server.js             # Application entry point
│   │   ├── config/               # Configuration modules
│   │   │   ├── db.js             # MongoDB connection
│   │   │   ├── env.js            # Environment variables
│   │   │   ├── cloudinary.js     # Cloudinary setup
│   │   │   └── arcjet.js         # Security config
│   │   ├── controllers/          # Route handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── user.controller.js
│   │   │   ├── song.controller.js
│   │   │   ├── playlist.controller.js
│   │   │   └── dominant.controller.js
│   │   ├── models/               # MongoDB schemas
│   │   ├── routes/               # API route definitions
│   │   └── middleware/           # Custom middleware
│   ├── package.json
│   ├── vercel.json               # Vercel deployment config
│   └── README.md
│
└── README.md                     # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 16+ and npm
- **Expo CLI** (for mobile development)
- **MongoDB** (local or MongoDB Atlas)
- **Cloudinary** account (for media storage)
- **Android Studio** or **Xcode** (for emulators, or use physical device)

### Setup Both Frontend & Backend

#### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

Create `.env` in the `backend` folder:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/neurotune
JWT_SECRET=your_jwt_secret_key_here
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET=your_cloudinary_api_secret
ARCJET_KEY=your_arcjet_key
PORT=5000
NODE_ENV=development
```

Start backend:

```bash
npm run dev
```

Backend will run on `http://localhost:5000`

#### 2. Install Frontend Dependencies

```bash
cd NeuroTune
npm install
```

Start frontend:

```bash
npx expo start
```

Scan the QR code with **Expo Go** or use Android Emulator / iOS Simulator.

#### 3. Connect Frontend to Backend

Update `NeuroTune/app/constants/api.js`:

```javascript
export const API_URL = 'http://localhost:5000'; // or your backend URL
```

## 🏗️ Tech Stack

### Mobile (NeuroTune/)
| Technology | Purpose |
|-----------|---------|
| **Expo** | React Native framework for cross-platform development |
| **React Native** | Mobile UI framework |
| **Expo Router** | File-based routing (similar to Next.js) |
| **Zustand** | Lightweight state management |
| **React Native Reanimated** | Smooth animations and transitions |
| **Expo AV** | Audio playback engine |
| **react-native-safe-area-context** | Safe area handling |

### Backend (backend/)
| Technology | Purpose |
|-----------|---------|
| **Express.js** | Web framework for Node.js |
| **MongoDB** | NoSQL database |
| **JWT** | Authentication tokens |
| **Cloudinary** | Cloud media storage |
| **node-vibrant** | Dominant color extraction |
| **Arcjet** | Security & rate limiting |
| **Vercel** | Serverless deployment |

## 📱 Mobile App Features

### Screens

- **Home**: Hero banners with featured playlists and song grid
- **Liked Songs**: All liked/favorited tracks with smooth scrolling
- **Playlists**: Create and manage custom playlists
- **User Songs**: Upload and manage your own music
- **Profile**: User profile and account settings
- **Player**: Full-screen playback view with controls

### Key UI Components

- **PlayerContainer**: Bottom mini player widget
- **PlaybackExpanded**: Full-screen player interface
- **GradientBackground**: Dynamic background with overlay
- **ContextMenu**: Long-press menu for song options

### Design Highlights

- Animated collapsing headers with parallax effect
- Smooth transitions between screens
- Dynamic color theming from album artwork
- Responsive layout for all screen sizes
- Safe area and notch handling

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/signup           - Register new user
POST   /api/auth/login            - User login
POST   /api/auth/logout           - User logout
POST   /api/auth/refresh          - Refresh JWT token
```

### Users
```
GET    /api/users/:id             - Get user profile
PUT    /api/users/:id             - Update profile
DELETE /api/users/:id             - Delete account
GET    /api/users/:id/stats       - User statistics
```

### Songs
```
GET    /api/songs                 - Get all songs (paginated)
POST   /api/songs                 - Upload new song
GET    /api/songs/:id             - Get song details
PUT    /api/songs/:id             - Update song metadata
DELETE /api/songs/:id             - Delete song
POST   /api/songs/:id/like        - Like a song
POST   /api/songs/:id/unlike      - Unlike a song
```

### Playlists
```
GET    /api/playlists             - Get user playlists
POST   /api/playlists             - Create new playlist
GET    /api/playlists/:id         - Get playlist details
PUT    /api/playlists/:id         - Update playlist
DELETE /api/playlists/:id         - Delete playlist
POST   /api/playlists/:id/songs   - Add song to playlist
DELETE /api/playlists/:id/songs/:songId - Remove song
```

### Image Processing
```
GET    /api/dominant?url=<URL>    - Extract dominant color from image
```

## 🛠️ Development

### Running in Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd NeuroTune
npx expo start
```

### Build Scripts

#### Frontend (NeuroTune/)
```bash
npx expo start                  # Start dev server
npx expo prebuild              # Generate native code
eas build --platform android   # Build for Android
eas build --platform ios       # Build for iOS
npm run lint                   # Run linter
```

#### Backend
```bash
npm run dev                    # Development with hot reload
npm run start                  # Production server
npm run lint                   # Run linter
npm run test                   # Run tests
```

## 📦 Deployment

### Mobile App (Expo)

Build and submit with EAS:

```bash
# Preview build (for testing)
eas build --platform android --profile preview

# Production build
eas build --platform android --profile production
eas submit --platform android  # Submit to Play Store
```

See `NeuroTune/eas.json` for build profiles.

### Backend API (Vercel)

The backend includes `vercel.json` for automatic Vercel deployment:

```bash
npm install -g vercel
vercel
```

Set environment variables in Vercel dashboard.

Alternatively, deploy to:
- **Heroku**: `git push heroku main`
- **Railway**: `railway up`
- **AWS/GCP/Azure**: Follow their Node.js guides

## 🔐 Security & Best Practices

### Frontend Security
- JWT tokens stored securely (Expo SecureStore)
- Environment variables for API URLs
- Input validation on forms
- HTTPS-only communication

### Backend Security
- JWT-based authentication with expiration
- MongoDB connection with authentication
- Arcjet rate limiting on sensitive endpoints
- CORS policy for mobile app only
- Input sanitization and validation
- Environment variables for secrets (never hardcoded)

### Database
- MongoDB with encryption at rest
- Indexed queries for performance
- Backup strategies recommended

## 📝 Environment Variables

### Backend (.env)
```env
MONGODB_URI                # MongoDB connection string
JWT_SECRET                 # JWT signing secret (32+ chars)
JWT_EXPIRY                 # Token expiration (e.g., 7d)
CLOUDINARY_NAME            # Cloudinary account name
CLOUDINARY_KEY             # Cloudinary API key
CLOUDINARY_SECRET          # Cloudinary secret
ARCJET_KEY                 # Arcjet API key (optional)
PORT                       # Server port (default: 5000)
NODE_ENV                   # development or production
```

### Frontend (app/constants/api.js)
```javascript
export const API_URL = 'http://localhost:5000'; // or production URL
export const API_TIMEOUT = 30000;
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't connect frontend to backend | Ensure backend is running on `http://localhost:5000` and update `API_URL` in `NeuroTune/app/constants/api.js` |
| Audio plays through earpiece (Android) | Set `playThroughEarpieceAndroid: false` in `store/playerStore.js` |
| FlatList content covered by header | Increase `contentContainerStyle.paddingTop` in playlist screens |
| MongoDB connection fails | Check connection string and network access in MongoDB Atlas |
| Cloudinary upload fails | Verify API credentials in `.env` |
| EAS build fails | Check `eas.json` profiles and ensure all credentials are set |

## 📚 Documentation

- **Frontend**: See `NeuroTune/README.md` for detailed mobile app documentation
- **Backend**: See `backend/README.md` for detailed API documentation
- **Architecture**: Project uses modular, component-based architecture for scalability

## 👥 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes in frontend or backend (or both)
3. Test thoroughly on both Android and iOS (if mobile)
4. Follow existing code structure and naming conventions
5. Commit with clear messages: `git commit -m "feat: add feature description"`
6. Push and create a Pull Request

## 📄 License

Proprietary - NeuroTune Development Team

Add a LICENSE file if planning to open-source.

## 📧 Support

For issues, feature requests, or questions:
- Open an issue in the project tracker
- Contact the NeuroTune development team

---

**Last Updated**: November 2025  
**Status**: Active Development  
**Version**: 1.0.0

---

## 🎯 Project Highlights

✅ **Complete Full-Stack Solution** - Both frontend and backend included  
✅ **Modern Architecture** - Expo Router file-based routing, Express REST API  
✅ **Cloud Integrated** - Cloudinary for media, MongoDB Atlas support  
✅ **Production Ready** - EAS builds, Vercel deployment, security hardened  
✅ **Well Documented** - Comprehensive README files for both frontend and backend  
✅ **Developer Friendly** - Hot reload, organized folder structure, clear naming conventions  

Enjoy building with NeuroTune! 🎶
