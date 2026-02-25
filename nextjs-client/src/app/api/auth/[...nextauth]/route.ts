import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";

function decodeJwtPayload(token: string): Record<string, unknown> | undefined {
  const parts = token.split(".");
  if (parts.length < 2) {
    return undefined;
  }

  try {
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    const decoded = Buffer.from(payload, "base64").toString("utf8");
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

const AUTH_SERVER_ENDPOINT = "http://localhost:3001";
const SUPERTOKENS_CLIENT_ID = "";
const SUPERTOKENS_CLIENT_SECRET = "";

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
          domain: "custom-domain.com",
          skip_consent: "true",
        },
      },
      token: {
        url: `${AUTH_SERVER_ENDPOINT}/auth/oauth/token`,
      },
      clientId: SUPERTOKENS_CLIENT_ID,
      clientSecret: SUPERTOKENS_CLIENT_SECRET,
      idToken: true,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || profile.sub,
          email: profile.email,
        };
      },
    },
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token && typeof account.access_token === "string") {
        token.accessToken = account.access_token;
        const payload = decodeJwtPayload(account.access_token);
        const accountId = payload?.account_id;
        token.accountId = typeof accountId === "string" ? accountId : undefined;
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken =
        typeof token.accessToken === "string" ? token.accessToken : undefined;
      session.accountId =
        typeof token.accountId === "string" ? token.accountId : undefined;
      return session;
    },
  },
  secret: "secret",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
