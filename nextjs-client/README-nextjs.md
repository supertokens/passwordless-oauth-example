# NextJS OAuth2 Client

A Next.js application that demonstrates OAuth2 authentication using NextAuth.js, similar to the original client folder but built with Next.js framework.

## Features

- OAuth2 authentication flow using NextAuth.js
- Clean, responsive UI with Tailwind CSS
- Session management
- Login/logout functionality
- Dashboard view for authenticated users

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Update the environment variables in `.env.local`:
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here
   OAUTH_CLIENT_ID=<CLIENT_ID>
   OAUTH_CLIENT_SECRET=<CLIENT_SECRET>
   ```

3. Make sure the authentication service is running on `http://localhost:3001`

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## OAuth Flow

This application implements the same OAuth2 flow as the original client but using NextAuth.js:

1. User clicks "Login with OAuth2" button
2. Redirected to the authorization server (`http://localhost:3001/auth/oauth/auth`)
3. After successful authentication, user is redirected back with authorization code
4. NextAuth.js exchanges the code for access tokens
5. User is redirected to the dashboard page

## Configuration

The OAuth2 configuration is set up in `src/app/api/auth/[...nextauth]/route.ts` to work with the same authentication service as the original client.

## Ports

- NextJS Client: `http://localhost:3000`
- Original Client Backend: `http://localhost:3004`
- Authentication Service: `http://localhost:3001`