# NeuroTune Backend API

A robust Express.js server powering the NeuroTune music player application. Handles user authentication, song management, playlists, and image processing with integrated security and cloud storage.

## Overview

The NeuroTune backend provides:
- **Authentication & Authorization**: JWT-based user management
- **Music Management**: Song uploads, metadata storage, and retrieval
- **Playlist Management**: Create, edit, and manage playlists
- **User Profiles**: User data and preferences
- **Image Processing**: Dominant color extraction for dynamic UI themes
- **Cloud Storage**: Cloudinary integration for file hosting
- **Security**: Arcjet rate limiting and request protection
- **Notifications**: Real-time updates and alerts

## Tech Stack

- **Runtime**: Node.js (16+)
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Image Service**: Cloudinary
- **Image Processing**: node-vibrant (dominant color extraction)
- **Security**: Arcjet
- **Deployment**: Vercel-ready with `vercel.json`

## Prerequisites

- **Node.js** 16+ and npm
- **MongoDB** instance (local or cloud, e.g., MongoDB Atlas)
- **Cloudinary** account (for image hosting)
- **Arcjet** API key (optional, for enhanced security)

## Installation

1. Clone or navigate to the backend folder:

```bash
cd backend
npm install
```

2. Create a `.env` file in the `backend` folder with the following variables:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/neurotune

# JWT
JWT_SECRET=your_jwt_secret_key_here

# Cloudinary
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET=your_cloudinary_api_secret

# Arcjet (optional)
ARCJET_KEY=your_arcjet_key

# Server
PORT=5000
NODE_ENV=development
```

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

The server will run on `http://localhost:5000` (or your configured `PORT`).

3. Test the API:

```bash
curl http://localhost:5000/api/health
```

## Project Structure

```
backend/
├── src/
│   ├── server.js                 # Application entry point
│   ├── config/                   # Configuration files
│   │   ├── db.js                 # MongoDB connection
│   │   ├── env.js                # Environment variables
│   │   ├── cloudinary.js         # Cloudinary setup
│   │   └── arcjet.js             # Arcjet security config
│   ├── controllers/              # Request handlers
│   │   ├── auth.controller.js    # Authentication logic
│   │   ├── user.controller.js    # User management
│   │   ├── song.controller.js    # Song operations
│   │   ├── playlist.controller.js # Playlist operations
│   │   ├── notification.controller.js
│   │   └── dominant.controller.js # Dominant color extraction
│   ├── models/                   # MongoDB schemas
│   │   ├── user.model.js
│   │   ├── song.model.js
│   │   ├── playlist.model.js
│   │   └── notification.model.js
│   ├── routes/                   # API route definitions
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── song.routes.js
│   │   ├── playlist.routes.js
│   │   ├── notification.routes.js
│   │   └── dominant.routes.js
│   └── middleware/               # Custom middleware
│       ├── auth.middleware.js    # JWT verification
│       ├── upload.middleware.js  # File upload handling
│       └── arcjet.middleware.js  # Rate limiting
├── package.json
├── vercel.json                   # Vercel deployment config
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user account
- `GET /api/users/:id/stats` - User statistics

### Songs
- `GET /api/songs` - Get all songs (paginated)
- `POST /api/songs` - Upload new song
- `GET /api/songs/:id` - Get song details
- `PUT /api/songs/:id` - Update song metadata
- `DELETE /api/songs/:id` - Delete song
- `POST /api/songs/:id/like` - Like a song
- `POST /api/songs/:id/unlike` - Unlike a song

### Playlists
- `GET /api/playlists` - Get user playlists
- `POST /api/playlists` - Create new playlist
- `GET /api/playlists/:id` - Get playlist details
- `PUT /api/playlists/:id` - Update playlist
- `DELETE /api/playlists/:id` - Delete playlist
- `POST /api/playlists/:id/songs` - Add song to playlist
- `DELETE /api/playlists/:id/songs/:songId` - Remove song from playlist

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/:id/read` - Mark notification as read
- `DELETE /api/notifications/:id` - Delete notification

### Image Processing
- `GET /api/dominant?url=<IMAGE_URL>` - Extract dominant color
  - Query Parameters:
    - `url` (required): Remote image URL
  - Response: `{ color: "#rrggbb", textColor: "#ffffff" }`
  - Example: `/api/dominant?url=https://example.com/art.jpg`

## Key Features

### Dominant Color Extraction
Extracts the dominant color from album artwork to dynamically theme the UI:
- Uses `node-vibrant` for palette analysis
- Returns contrast-optimized text color (`#ffffff` or `#000000`)
- 10-minute in-memory cache to reduce redundant processing
- Improves visual cohesion in the mobile app

### File Uploads
Songs and images are uploaded to Cloudinary:
- Configured in `src/config/cloudinary.js`
- Middleware: `src/middleware/upload.middleware.js`
- Supports multiple file types (audio, images)

### Authentication
- JWT-based authentication
- Middleware: `src/middleware/auth.middleware.js`
- Tokens include user ID and role information
- Automatic token refresh support

### Rate Limiting & Security
- Arcjet integration for DDoS protection
- Rate limiting on sensitive endpoints (auth, uploads)
- Request validation and sanitization

## Development

### Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Start production server
npm run start

# Run linting
npm run lint

# Run tests (if configured)
npm run test
```

### Environment-Specific Behavior

- **Development** (`NODE_ENV=development`): Detailed logging, hot reload enabled
- **Production** (`NODE_ENV=production`): Optimized, minified, error tracking enabled

### Testing the API Locally

Use Postman, cURL, or REST Client extensions to test endpoints:

```bash
# Test health check
curl http://localhost:5000/api/health

# Test dominant color extraction
curl "http://localhost:5000/api/dominant?url=https://example.com/image.jpg"
```

## Deployment

### Vercel

The project includes `vercel.json` for seamless Vercel deployment:

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel project settings
3. Deploy:

```bash
npm install -g vercel
vercel
```

### Other Platforms

Deploy as a standard Node.js / Express application:

```bash
# Heroku
heroku create neurotune-api
git push heroku main

# Railway
railway link
railway up

# AWS/GCP/Azure
Follow their Node.js deployment guides
```

## Database Configuration

### MongoDB Atlas (Recommended)

1. Create a cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Copy the connection string: `mongodb+srv://username:password@cluster.mongodb.net/neurotune`
3. Add to `.env`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/neurotune
```

### Local MongoDB

For local development:

```env
MONGODB_URI=mongodb://localhost:27017/neurotune
```

Run MongoDB locally:

```bash
# macOS with Homebrew
brew services start mongodb-community

# Docker
docker run -d -p 27017:27017 --name mongodb mongo
```

## Cloudinary Setup

1. Sign up at [Cloudinary](https://cloudinary.com/)
2. Navigate to Account Settings → API Keys
3. Copy your credentials and add to `.env`:

```env
CLOUDINARY_NAME=your_name
CLOUDINARY_KEY=your_api_key
CLOUDINARY_SECRET=your_api_secret
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection fails | Check `MONGODB_URI` and network access in MongoDB Atlas |
| Cloudinary upload fails | Verify API credentials and that unsigned uploads are enabled |
| Arcjet rate limiting too strict | Adjust thresholds in `src/config/arcjet.js` |
| JWT token expired | Implement token refresh logic or increase `JWT_EXPIRY` |
| Dominant color extraction slow | Check image URL accessibility; cache may not be persisting |

## Security Best Practices

1. **Environment Variables**: Never commit `.env` files; use `.env.example`
2. **JWT Secrets**: Use strong, randomly generated secrets (minimum 32 characters)
3. **File Validation**: Validate file types and sizes on upload
4. **CORS**: Configure CORS policy to allow only trusted origins
5. **Input Validation**: Sanitize all user inputs
6. **Rate Limiting**: Enable Arcjet or similar protection on production
7. **HTTPS**: Always use HTTPS in production

## Performance Optimization

- **Database Indexing**: Ensure indexes on frequently queried fields (`userId`, `playlistId`, etc.)
- **Caching**: Dominant color extraction uses in-memory cache; consider Redis for distributed deployments
- **Pagination**: All list endpoints support pagination to reduce payload size
- **Compression**: gzip compression enabled on all responses

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Write clear, commented code
3. Test thoroughly before submitting
4. Follow the existing code structure and patterns
5. Update API documentation if adding new endpoints

## API Documentation

For detailed API documentation, generate with Swagger/OpenAPI (if configured) or refer to the route files in `src/routes/`.

## Support & License

This backend is part of the NeuroTune project. For issues or feature requests, contact the development team.

**License**: Proprietary (add LICENSE file if open-sourcing)

---

**Last Updated**: November 2025  
**Status**: Active Development  
**Maintainer**: NeuroTune Development Team
