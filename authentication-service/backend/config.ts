import Passwordless from "supertokens-node/recipe/passwordless";
import Session from "supertokens-node/recipe/session";
import OAuth2Provider from "supertokens-node/recipe/oauth2provider";
import Dashboard from "supertokens-node/recipe/dashboard";
import UserRoles from "supertokens-node/recipe/userroles";
import type { TypeInput } from "supertokens-node/types";

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
  supertokens: {
    connectionURI: "<CONNECTION_URI>",
    apiKey: "<API_KEY>",
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
            createCodePOST: async (input) => {
              return await originalImplementation.createCodePOST({
                ...input,
                userContext: {
                  ...input.userContext,
                  oauthState: input.options.req.original.query,
                },
              });
            },
            resendCodePOST: async (input) => {
              return await originalImplementation.resendCodePOST({
                ...input,
                userContext: {
                  ...input.userContext,
                  oauthState: input.options.req.original.query,
                },
              });
            },
          };
        },
      },
      emailDelivery: {
        override: (originalImplementation) => {
          return {
            ...originalImplementation,
            sendEmail: async (input) => {
              const magicLink = input.urlWithLinkCode as string;
              const oauthState = input.userContext.oauthState;
              const magicLinkWithOauthQuery = new URL(magicLink);
              const magicLinkQueryParams = new URLSearchParams(
                magicLinkWithOauthQuery.search,
              );
              for (const key in oauthState) {
                magicLinkQueryParams.set(key, oauthState[key]);
              }

              magicLinkWithOauthQuery.search = magicLinkQueryParams.toString();
              return originalImplementation.sendEmail({
                ...input,
                urlWithLinkCode: magicLinkWithOauthQuery.toString(),
              });
            },
          };
        },
      },
    }),
    OAuth2Provider.init(),
    Dashboard.init(),
    UserRoles.init(),
    Session.init(),
  ],
};
