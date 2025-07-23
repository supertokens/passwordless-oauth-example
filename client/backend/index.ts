import express, { Request, Response } from "express";
import passport from "passport";
import { Strategy as OAuth2Strategy } from "passport-oauth2";
import session from "express-session";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(
  cors({
    origin: "http://localhost:3003",
    credentials: true,
  }),
);

app.use(
  session({
    secret: "oauth2-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  }),
);

app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());

const AUTH_SERVER_ENDPOINT = "http://localhost:3001";
const OAUTH_CLIENT_ID = "<CLIENT_ID>";
const OAUTH_CLIENT_SECRET = "<CLIENT_SECRET>";

passport.use(
  new OAuth2Strategy(
    {
      authorizationURL: `${AUTH_SERVER_ENDPOINT}/auth/oauth/auth`,
      tokenURL: `${AUTH_SERVER_ENDPOINT}/auth/oauth/token`,
      clientID: OAUTH_CLIENT_ID,
      clientSecret: OAUTH_CLIENT_SECRET,
      callbackURL: `http://localhost:${PORT}/oauth/callback`,
      state: true,
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: (error: any, user?: any) => void,
    ) => {
      try {
        const tokenParts = accessToken.split(".");
        if (tokenParts.length !== 3) {
          throw new Error("Invalid JWT token format");
        }

        const payload = JSON.parse(
          Buffer.from(tokenParts[1], "base64").toString(),
        );
        const userId = payload.sub;

        console.log("Extracted user ID from token:", userId);

        const user = {
          id: userId,
          accessToken,
          refreshToken,
          profile: { ...profile, sub: userId },
        };

        done(null, user);
      } catch (error) {
        console.error("Error parsing access token:", error);
        done(error);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

app.get(
  "/auth/oauth",
  passport.authenticate("oauth2", {
    scope: ["admin"],
  }),
);

app.get(
  "/oauth/callback",
  passport.authenticate("oauth2", { failureRedirect: "/login-failed" }),
  (req: Request, res: Response) => {
    res.redirect("http://localhost:3003/dashboard");
  },
);

app.get("/api/user", (req: Request, res: Response) => {
  if (req.isAuthenticated() && req.user) {
    const user = req.user as any;
    res.json({
      success: true,
      user: user.profile,
    });
  } else {
    res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }
});

app.get("/logout", (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ success: true, message: "Logged out successfully" });
  });
});

app.get("/login-failed", (req: Request, res: Response) => {
  res.status(401).json({
    success: false,
    message: "Authentication failed",
  });
});

app.listen(PORT, () => {
  console.log(`OAuth2 API server running on http://localhost:${PORT}`);
});
