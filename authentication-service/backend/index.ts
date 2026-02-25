import express from "express";
import cors from "cors";
import SuperTokens from "supertokens-node";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import {
  middleware,
  errorHandler,
  SessionRequest,
} from "supertokens-node/framework/express";
import {
  API_KEY,
  CONNECTION_URI,
  getWebsiteDomain,
  SuperTokensConfig,
} from "./config.js";

SuperTokens.init(SuperTokensConfig);

const app = express();

app.use(
  cors({
    origin: getWebsiteDomain(),
    allowedHeaders: ["content-type", ...SuperTokens.getAllCORSHeaders()],
    methods: ["GET", "PUT", "POST", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json());

app.use(middleware());

const extractRedirectUriQueryParam = (redirectToPath: string) => {
  const queryIndex = redirectToPath.indexOf("?");
  if (queryIndex === -1) {
    throw new Error("No query params found in redirectToPath");
  }
  const queryString = redirectToPath.substring(queryIndex + 1);
  const params = queryString.split("&");

  for (const param of params) {
    const [key, value] = param.split("=");
    if (decodeURIComponent(key) === "redirect_uri") {
      return decodeURIComponent(value);
    }
  }
  throw new Error("No redirectTo query param found in redirectToPath");
};

async function rejectLoginRequest(challenge: string) {
  const url = `${CONNECTION_URI}/appid-public/recipe/oauth/auth/requests/login/reject?loginChallenge=${challenge}`;
  const response = await fetch(url, {
    method: "PUT",
    body: JSON.stringify({}),
    headers: {
      "Content-Type": "application/json",
      "api-key": API_KEY,
    },
  });

  console.log("response", response);
  console.log("response.status", response.status);

  if (!response.ok) {
    throw new Error("Failed to reject login request");
  }

  const body = (await response.json()) as
    | { status: "OK"; redirectTo: string }
    | { status: "OAUTH_ERROR" };

  if (body.status === "OAUTH_ERROR") {
    throw new Error("Failed to reject login request");
  }

  return body;
}

app.post("/auth/oauth/reject-login-request", async (req, res) => {
  const loginChallenge = req.query.loginChallenge as string;
  const rejectResponse = await rejectLoginRequest(loginChallenge);
  console.log("rejectResponse", rejectResponse);
  const redirectUri = extractRedirectUriQueryParam(rejectResponse.redirectTo);
  console.log("redirectUri", redirectUri);
  res.contentType("application/json");
  res.status(200).send({
    redirectUri,
  });
});

// Get consent request details
app.get("/auth/oauth/consent", async (req, res) => {
  const consentChallenge = req.query.consent_challenge as string;
  const redirectTo = req.query.redirect_to as string;

  if (!consentChallenge) {
    return res.status(400).json({ error: "Missing consent_challenge" });
  }

  try {
    const url = `${CONNECTION_URI}/appid-public/recipe/oauth/auth/requests/consent?consentChallenge=${consentChallenge}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
    });

    const consentRequest = await response.json();

    if (consentRequest.status === "OAUTH_ERROR") {
      return res.status(400).json({ error: "Invalid consent challenge" });
    }

    // Return consent details to frontend
    res.status(200).json({
      consentChallenge,
      redirectTo,
      requestedScopes: consentRequest.requestedScope || [],
      clientName: consentRequest.client?.clientName,
      clientId: consentRequest.client?.clientId,
    });
  } catch (error) {
    console.error("Error fetching consent request:", error);
    res.status(500).json({ error: "Failed to fetch consent request" });
  }

  return;
});

// Accept consent request with account selection
app.post(
  "/auth/oauth/accept-consent",
  verifySession(),
  async (req: SessionRequest, res) => {
    console.log(
      "accept-consent called, session:",
      req.session ? "exists" : "no session",
    );
    console.log("cookies:", req.headers.cookie);

    const { consentChallenge, accountId, redirectTo } = req.body;
    const session = req.session;

    if (!consentChallenge || !redirectTo) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    if (!session) {
      return res.status(401).json({ error: "Session required" });
    }

    try {
      // Get consent request to see what's being requested
      const consentUrl = `${CONNECTION_URI}/appid-public/recipe/oauth/auth/requests/consent?consentChallenge=${consentChallenge}`;
      const consentResponse = await fetch(consentUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "api-key": API_KEY,
        },
      });
      const consentRequest = await consentResponse.json();

      if (consentRequest.status === "OAUTH_ERROR") {
        return res.status(400).json({ error: "Invalid consent challenge" });
      }

      // Accept consent with account info in token payload
      const acceptUrl = `${CONNECTION_URI}/appid-public/recipe/oauth/auth/requests/consent/accept?consentChallenge=${consentChallenge}`;
      const acceptResponse = await fetch(acceptUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "api-key": API_KEY,
        },
        body: JSON.stringify({
          grantScope: consentRequest.requestedScope || [],
          grantAccessTokenAudience:
            consentRequest.requestedAccessTokenAudience || [],
          iss: "http://localhost:3001/auth",
          tId: session.getTenantId(),
          rsub: session.getRecipeUserId().getAsString(),
          sessionHandle: session.getHandle(),
          initialAccessTokenPayload: {
            selected_account: accountId,
          },
          initialIdTokenPayload: {
            selected_account: accountId,
          },
        }),
      });

      const acceptResult = await acceptResponse.json();

      if (acceptResult.status === "OAUTH_ERROR") {
        return res.status(400).json({ error: "Failed to accept consent" });
      }

      // Extract redirect_uri from the redirectTo and return it
      const finalRedirectUri = extractRedirectUriQueryParam(
        acceptResult.redirectTo,
      );

      res.status(200).json({
        redirectUri: finalRedirectUri,
      });
    } catch (error) {
      console.error("Error accepting consent:", error);
      res.status(500).json({ error: "Failed to accept consent" });
    }

    if (!session) {
      return res.status(401).json({ error: "Session required" });
    }

    try {
      // @ts-ignore - getInstanceOrThrowError exists at runtime but not in types
      const st = SuperTokens.getInstanceOrThrowError();
      const oauthRecipe = st.getRecipeInstanceOrThrow("oauth2provider");

      // Get consent request to see what's being requested
      const consentRequest =
        await oauthRecipe.recipeInterfaceImpl.getConsentRequest({
          challenge: consentChallenge,
          userContext: {},
        });

      if ("error" in consentRequest) {
        return res.status(400).json({ error: "Invalid consent challenge" });
      }

      // Accept consent with account info in token payload
      const acceptResult =
        await oauthRecipe.recipeInterfaceImpl.acceptConsentRequest({
          challenge: consentChallenge,
          grantScope: consentRequest.requestedScope || [],
          grantAccessTokenAudience:
            consentRequest.requestedAccessTokenAudience || [],
          tenantId: session.getTenantId(),
          rsub: session.getRecipeUserId().getAsString(),
          sessionHandle: session.getHandle(),
          initialAccessTokenPayload: {
            selected_account: accountId,
          },
          initialIdTokenPayload: {
            selected_account: accountId,
          },
          userContext: {},
        });

      if ("error" in acceptResult) {
        return res.status(400).json({ error: "Failed to accept consent" });
      }

      // Extract redirect_uri from the redirectTo and return it
      const finalRedirectUri = extractRedirectUriQueryParam(
        acceptResult.redirectTo,
      );

      res.status(200).json({
        redirectUri: finalRedirectUri,
      });
    } catch (error) {
      console.error("Error accepting consent:", error);
      res.status(500).json({ error: "Failed to accept consent" });
    }

    return;
  },
);

// In case of session related errors, this error handler
// returns 401 to the client.
app.use(errorHandler());

app.use(
  (error: any, req: express.Request, res: express.Response, next: any) => {
    console.error("Unhandled error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  },
);

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

app.listen(3001, () => console.log(`API Server listening on port 3001`));
