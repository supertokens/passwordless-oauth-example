import Passwordless from "supertokens-node/recipe/passwordless";
import { SMTPService } from "supertokens-node/recipe/passwordless/emaildelivery";
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
  debug: true,
  supertokens: {
    connectionURI: "<SUPERTOKENS_CONNECTION_URI>",
    apiKey: "<SUPERTOKENS_API_KEY>",
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
      emailDelivery: {
        service: new SMTPService({
          smtpSettings: {
            host: "<SMTP_HOST>",
            from: {
              name: "SuperTokens Demo App",
              email: "no-reply@example.com",
            },
            port: 587,
            secure: false,
            authUsername: "<SMTP_USERNAME>",
            password: "<SMTP_PASSWORD>",
          },
          override: (originalImplementation) => {
            return {
              ...originalImplementation,
              getContent: async function (input) {
                const domain = input.userContext?.domain;
                const subject = domain
                  ? `Login to ${domain}`
                  : "Login to your account";
                const linkUrl = input.urlWithLinkCode || "";
                const body = `
                  <div style="font-family: Arial, sans-serif;">
                    <h2>Finish signing in</h2>
                    ${
                      domain
                        ? `<p>Signing in to <strong>${domain}</strong></p>`
                        : ""
                    }
                    <p><a href="${linkUrl}">Sign in</a></p>
                  </div>
                `;
                return {
                  body,
                  isHtml: true,
                  subject,
                  toEmail: input.email,
                };
              },
            };
          },
        }),
      },
    }),
    OAuth2Provider.init({
      override: {
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
