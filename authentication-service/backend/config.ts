import Passwordless from "supertokens-node/recipe/passwordless";
import { SMTPService } from "supertokens-node/recipe/passwordless/emaildelivery";
import Session from "supertokens-node/recipe/session";
import OAuth2Provider from "supertokens-node/recipe/oauth2provider";
import Dashboard from "supertokens-node/recipe/dashboard";
import UserRoles from "supertokens-node/recipe/userroles";
import type { TypeInput } from "supertokens-node/types";

export const API_KEY = "";
export const CONNECTION_URI =
  "";

export function getApiDomain() {
  const apiPort = 3001;
  const apiUrl = `http://localhost:${apiPort}`;
  return apiUrl;
}

export function getWebsiteDomain() {
  const websitePort = 3000;
  const websiteUrl = `http://localhost:${websitePort}`;
  return websiteUrl;
}

export const SuperTokensConfig: TypeInput = {
  debug: true,
  supertokens: {
    connectionURI:
      "https://st-dev-bc3c6f90-79ba-11ef-ab9e-9bd286159eeb.aws.supertokens.io",
    apiKey: "e9zZOI7yJ0-G6gms7iGKZ17Pb-",
  },
  appInfo: {
    appName: "SuperTokens Demo App",
    apiDomain: getApiDomain(),
    websiteDomain: getWebsiteDomain(),
    apiBasePath: "/auth",
    websiteBasePath: "/auth",
  },
  recipeList: [
    Passwordless.init({
      contactMethod: "EMAIL",
      flowType: "MAGIC_LINK",
      override: {
        apis: (originalImplementation) => {
          return {
            ...originalImplementation,
            createCodePOST: async function (input) {
              const body = await input.options.req.getJSONBody();
              const domain = body?.domain;
              return originalImplementation.createCodePOST!({
                ...input,
                userContext: { ...input.userContext, domain },
              });
            },
            resendCodePOST: async function (input) {
              const body = await input.options.req.getJSONBody();
              const domain = body?.domain;
              return originalImplementation.resendCodePOST!({
                ...input,
                userContext: { ...input.userContext, domain },
              });
            },
          };
        },
      },
    }),
    OAuth2Provider.init({
      override: {
        functions: (originalImplementation) => {
          return {
            ...originalImplementation,
            // Override to intercept auto-consent and redirect to consent screen
            acceptConsentRequest: async function (input) {
              console.log(
                "acceptConsentRequest called with userContext:",
                input.userContext,
              );
              // Check if this is being called from the authorization flow (auto-consent)
              // We detect this via a flag in userContext that the SDK passes
              if (input.userContext?.__isAutoConsent === true) {
                console.log(
                  "Auto-consent detected, redirecting to consent screen",
                );
                // Redirect to frontend consent screen instead of auto-accepting
                const consentRedirectUrl = new URL(
                  "/oauth/consent",
                  getWebsiteDomain(),
                );
                consentRedirectUrl.searchParams.set(
                  "consent_challenge",
                  input.challenge,
                );

                return {
                  redirectTo: consentRedirectUrl.toString(),
                  status: "OK",
                };
              }

              console.log("Normal consent flow, calling original");
              // Normal flow - call the original implementation
              return originalImplementation.acceptConsentRequest!(input);
            },
          };
        },
        apis: (originalImplementation) => {
          return {
            ...originalImplementation,
            authGET: async function (input) {
              const domain = input.params?.domain;
              const response = await originalImplementation.authGET!(input);

              if ("redirectTo" in response) {
                const redirectTo = response.redirectTo;
                const redirectToWithDomain = `${redirectTo}&domain=${domain}`;
                response.redirectTo = redirectToWithDomain;
              }

              return response;
            },
          };
        },
      },
    }),
    Dashboard.init(),
    UserRoles.init(),
    Session.init(),
  ],
};
