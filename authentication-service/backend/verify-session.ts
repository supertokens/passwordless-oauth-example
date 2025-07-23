import supertokens from "supertokens-node";
import Session from "supertokens-node/recipe/session";
import express, { Request, Response, NextFunction } from "express";
import * as jose from "jose";
import { getApiDomain } from "config";

interface RequestWithUserId extends Request {
  userId?: string;
}

async function verifySession(
  req: RequestWithUserId,
  res: Response,
  next: NextFunction,
) {
  let session = undefined;
  try {
    session = await Session.getSession(req, res, { sessionRequired: false });
  } catch (err) {
    if (
      !Session.Error.isErrorFromSuperTokens(err) ||
      err.type !== Session.Error.TRY_REFRESH_TOKEN
    ) {
      return next(err);
    }
  }

  // In this case we are dealing with a SuperTokens Session
  if (session !== undefined) {
    const userId = session.getUserId();
    req.userId = userId;
    return next();
  }

  // The OAuth2 Access Token needs to be manually extracted and validated
  let jwt: string | undefined = undefined;
  if (req.headers["authorization"]) {
    jwt = req.headers["authorization"].split("Bearer ")[1];
  }
  if (jwt === undefined) {
    return next(new Error("No JWT found in the request"));
  }

  try {
    const tokenPayload = await validateToken(jwt, "<CUSTOM_SCOPE>");
    const userId = tokenPayload.sub;
    req.userId = userId;
    return next();
  } catch (err) {
    return next(err);
  }
}

const JWKS = jose.createRemoteJWKSet(
  new URL(`${getApiDomain()}/auth/jwt/jwks.json`),
);

// This is a basic example on how to validate an OAuth2 Token
// We have a separate page that talks more in depth about the process
async function validateToken(jwt: string, requiredScope: string) {
  const { payload } = await jose.jwtVerify(jwt, JWKS, {
    requiredClaims: ["stt", "scp", "sub"],
  });

  if (payload.stt !== 1) throw new Error("Invalid token");
  const scopes = payload.scp as string[];
  if (!scopes.includes(requiredScope)) throw new Error("Invalid token");

  return payload;
}
