import Passwordless from "supertokens-node/recipe/passwordless";
import Session from "supertokens-node/recipe/session";
import OAuth2Provider from "supertokens-node/recipe/oauth2provider";
import Dashboard from "supertokens-node/recipe/dashboard";
import UserRoles from "supertokens-node/recipe/userroles";
import type { TypeInput } from "supertokens-node/types";
import type { RecipeInterface as OAuth2ProviderRecipeInterface } from "supertokens-node/recipe/oauth2provider/types";

export const API_KEY = "e9zZOI7yJ0-G6gms7iGKZ17Pb-";
export const CONNECTION_URI =
  "https://st-dev-bc3c6f90-79ba-11ef-ab9e-9bd286159eeb.aws.supertokens.io";

let oauth2ProviderRecipeImplementation:
  | OAuth2ProviderRecipeInterface
  | undefined;

export function getOAuth2ProviderRecipeImplementationOrThrow(): OAuth2ProviderRecipeInterface {
  if (!oauth2ProviderRecipeImplementation) {
    throw new Error("OAuth2Provider recipe not initialized");
  }
  return oauth2ProviderRecipeImplementation;
}

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
        functions: (_originalImplementation) => {
          oauth2ProviderRecipeImplementation = _originalImplementation;
          return {
            ..._originalImplementation,
            acceptConsentRequest: async function (input) {
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
            },
          };
        },
        apis: (originalImplementation) => {
          return {
            ...originalImplementation,
            authGET: async function (input) {
              const domain = input.params?.domain;
              const response = await originalImplementation.authGET!(input);

              if (domain && "redirectTo" in response) {
                const redirectTo = response.redirectTo;
                const separator = redirectTo.includes("?") ? "&" : "?";
                response.redirectTo = `${redirectTo}${separator}domain=${encodeURIComponent(domain)}`;
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
