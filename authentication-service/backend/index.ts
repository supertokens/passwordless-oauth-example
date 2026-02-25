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

async function readJsonResponse(response: Response) {
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Non-JSON response from core (${response.status}): ${raw}`);
  }
}

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

  const body = (await readJsonResponse(response)) as
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
app.get(
  "/auth/oauth/consent",
  verifySession(),
  async (req: SessionRequest, res) => {
    const consentChallenge = req.query.consent_challenge as string;
    const session = req.session;

    if (!consentChallenge) {
      return res.status(400).json({ error: "Missing consent_challenge" });
    }

    if (!session) {
      return res.status(401).json({ error: "Session required" });
    }

    try {
      const encodedConsentChallenge = encodeURIComponent(consentChallenge);
      const url = `${CONNECTION_URI}/appid-public/recipe/oauth/auth/requests/consent?consentChallenge=${encodedConsentChallenge}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "api-key": API_KEY,
        },
      });

      const consentRequest = await readJsonResponse(response);

      if (consentRequest.status === "OAUTH_ERROR") {
        return res.status(400).json({
          error: "Invalid consent challenge",
          details: consentRequest.errorDescription || consentRequest.error,
        });
      }

      if (consentRequest.subject !== session.getRecipeUserId().getAsString()) {
        return res.status(403).json({
          error: "Consent request does not belong to current session",
        });
      }

      // Return consent details to frontend
      res.status(200).json({
        consentChallenge,
        requestedScopes: consentRequest.requestedScope || [],
        requestedAccessTokenAudience:
          consentRequest.requestedAccessTokenAudience || [],
        clientName: consentRequest.client?.clientName,
        clientId: consentRequest.client?.clientId,
      });
    } catch (error) {
      console.error("Error fetching consent request:", error);
      res.status(500).json({ error: "Failed to fetch consent request" });
    }

    return;
  },
);

// Accept consent request with account selection
app.post(
  "/auth/oauth/accept-consent",
  verifySession(),
  async (req: SessionRequest, res) => {
    console.log(
      "accept-consent called, session:",
      req.session ? "exists" : "no session",
    );

    const { consentChallenge, accountId } = req.body;
    const session = req.session;

    if (!consentChallenge || !accountId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    if (!session) {
      return res.status(401).json({ error: "Session required" });
    }

    try {
      // Get consent request to see what's being requested
      const encodedConsentChallenge = encodeURIComponent(consentChallenge);
      const consentUrl = `${CONNECTION_URI}/appid-public/recipe/oauth/auth/requests/consent?consentChallenge=${encodedConsentChallenge}`;
      const consentResponse = await fetch(consentUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "api-key": API_KEY,
        },
      });
      const consentRequest = await readJsonResponse(consentResponse);

      if (consentRequest.status === "OAUTH_ERROR") {
        return res.status(400).json({
          error: "Invalid consent challenge",
          details: consentRequest.errorDescription || consentRequest.error,
        });
      }

      if (consentRequest.subject !== session.getRecipeUserId().getAsString()) {
        return res.status(403).json({
          error: "Consent request does not belong to current session",
        });
      }

      // Accept consent with account info in token payload
      const acceptUrl = `${CONNECTION_URI}/appid-public/recipe/oauth/auth/requests/consent/accept?consentChallenge=${encodedConsentChallenge}`;
      const acceptRequestBody = {
        grantScope: consentRequest.requestedScope || [],
        grantAccessTokenAudience:
          consentRequest.requestedAccessTokenAudience || [],
        session: {
          accessToken: {
            account_id: accountId,
          },
        },
      };
      const acceptResponse = await fetch(acceptUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "api-key": API_KEY,
        },
        body: JSON.stringify(acceptRequestBody),
      });

      const acceptResponseText = await acceptResponse.text();
      if (!acceptResponse.ok) {
        return res.status(400).json({
          error: "Failed to accept consent",
          details: acceptResponseText,
          debugRequestBody: acceptRequestBody,
        });
      }

      let acceptResult: any;
      try {
        acceptResult = JSON.parse(acceptResponseText);
      } catch {
        throw new Error(
          `Non-JSON response from core (${acceptResponse.status}): ${acceptResponseText}`,
        );
      }

      if (acceptResult.status === "OAUTH_ERROR") {
        return res.status(400).json({
          error: "Failed to accept consent",
          details: acceptResult.errorDescription || acceptResult.error,
        });
      }

      res.status(200).json({
        redirectTo: acceptResult.redirectTo,
      });
      return;
    } catch (error) {
      console.error("Error accepting consent:", error);
      res.status(500).json({ error: "Failed to accept consent" });
      return;
    }
  },
);

// In case of session related errors, this error handler
// returns 401 to the client.
app.use(errorHandler());

app.use(
  (error: any, _req: express.Request, res: express.Response, _next: any) => {
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
