import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";

const AUTH_SERVER_ENDPOINT = "http://localhost:3001";
const SUPERTOKENS_CLIENT_ID = "<YOUR_CLIENT_ID>";
const SUPERTOKENS_CLIENT_SECRET = "<YOUR_CLIENT_SECRET>";

const authOptions: NextAuthOptions = {
  debug: true,
  providers: [
    {
      id: "oauth",
      name: "pei-client",
      type: "oauth",
      checks: ["state", "pkce"],
      issuer: `${AUTH_SERVER_ENDPOINT}/auth`,
      jwks_endpoint: `${AUTH_SERVER_ENDPOINT}/auth/jwt/jwks.json`,
      authorization: {
        url: `${AUTH_SERVER_ENDPOINT}/auth/oauth/auth`,
        params: {
          scope: "offline_access email openid",
          response_type: "code",
        },
      },
      token: {
        url: `${AUTH_SERVER_ENDPOINT}/auth/oauth/token`,
      },
      clientId: SUPERTOKENS_CLIENT_ID,
      clientSecret: SUPERTOKENS_CLIENT_SECRET,
      idToken: true,
      profile(profile) {
        console.log("[SuperTokensProvider] Raw profile:", profile);
        return {
          id: profile.sub,
          name: profile.name || profile.sub,
          email: profile.email,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      console.log(
        "[SuperTokensProvider] JWT callback received:",
        token,
        account,
      );
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      console.log(
        "[SuperTokensProvider] Session callback received:",
        session,
        token,
      );
      session.accessToken = token.accessToken;
      return session;
    },
    async signIn({ user, account, profile }) {
      console.log(
        "[SuperTokensProvider] SignIn callback received:",
        user,
        account,
        profile,
      );
      return true;
    },
  },
  session: { strategy: "jwt" },
  secret: "secret",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
