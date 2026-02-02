import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";

const AUTH_SERVER_ENDPOINT = "http://localhost:3001";
const SUPERTOKENS_CLIENT_ID = "<OAUTH_CLIENT_ID>";
const SUPERTOKENS_CLIENT_SECRET = "<OAUTH_CLIENT_SECRET>";

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
  secret: "secret",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
