# OAuth2 Example Application (TypeScript)

This is a complete OAuth2 authentication example with a React frontend and Node.js Express API using Passport.js, built with TypeScript.

## Structure

```
client/
├── src/
│   ├── server.ts       # Express API with OAuth2 authentication
│   └── types.ts        # TypeScript type definitions
├── tsconfig.json       # TypeScript configuration for API
├── nodemon.json        # Nodemon configuration
├── package.json        # API dependencies
├── frontend/
│   ├── src/
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── types.ts    # Frontend type definitions
│   │   └── components/
│   │       ├── Home.tsx     # Login page with OAuth2 button
│   │       └── Dashboard.tsx # User info display after login
│   ├── tsconfig.json   # TypeScript configuration for React
│   ├── package.json    # React app dependencies
│   └── public/
│       └── index.html
```

## Setup and Running

### 1. Install API dependencies
```bash
cd client
npm install
```

### 2. Install Frontend dependencies
```bash
cd frontend
npm install
```

### 3. Start the API server
```bash
cd client
npm run dev
```
The API will run on http://localhost:3001

### 4. Start the React frontend
```bash
cd client/frontend
npm start
```
The frontend will run on http://localhost:3000

## TypeScript Features

- **Strong Typing**: Full type safety for OAuth2 flow, user profiles, and API responses
- **Type Definitions**: Comprehensive interfaces for client configuration and user data
- **Express Types**: Proper typing for Express middleware and request/response objects
- **React Types**: Full TypeScript support for React components and hooks

## How it works

1. **Frontend (React + TypeScript)**: Shows a login button that redirects to the API's OAuth2 endpoint
2. **API (Express + Passport + TypeScript)**: Handles OAuth2 flow using credentials from `client.json`
3. **Authentication Flow**:
   - User clicks "Login with OAuth2" button
   - Redirected to OAuth2 authorization server
   - After successful auth, redirected back to API callback
   - API exchanges code for access token and fetches user info
   - User redirected to dashboard showing their information

## Configuration

The OAuth2 configuration is automatically loaded from the `client.json` file in the parent directory. The API expects:
- OAuth2 authorization server at `http://localhost:3567`
- Endpoints: `/oauth/auth`, `/oauth/token`, `/oauth/userinfo`

## API Endpoints

- `GET /auth/oauth` - Initiates OAuth2 flow
- `GET /oauth/callback` - OAuth2 callback handler
- `GET /api/user` - Returns authenticated user info
- `GET /logout` - Logs out the user

## Building for Production

### API
```bash
cd client
npm run build
npm start
```

### Frontend
```bash
cd client/frontend
npm run build
```