import express from "express";
import cors from "cors";
import supertokens from "supertokens-node";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import OAuth2Provider from "supertokens-node/recipe/oauth2provider";
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
import Multitenancy from "supertokens-node/recipe/multitenancy";

supertokens.init(SuperTokensConfig);

const app = express();

app.use(
  cors({
    origin: getWebsiteDomain(),
    allowedHeaders: ["content-type", ...supertokens.getAllCORSHeaders()],
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

// In case of session related errors, this error handler
// returns 401 to the client.
app.use(errorHandler());

app.use(
  (error: any, req: express.Request, res: express.Response, next: any) => {
    res.status(500).send("Something broke!");
  },
);

app.listen(3001, () => console.log(`API Server listening on port 3001`));
