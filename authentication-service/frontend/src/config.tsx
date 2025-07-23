"use client";

import Passwordless, {
  PasswordlessComponentsOverrideProvider,
} from "supertokens-auth-react/recipe/passwordless";
import { PasswordlessPreBuiltUI } from "supertokens-auth-react/recipe/passwordless/prebuiltui";
import Session from "supertokens-auth-react/recipe/session";
import OAuth2Provider from "supertokens-auth-react/recipe/oauth2provider";
import { OAuth2ProviderPreBuiltUI } from "supertokens-auth-react/recipe/oauth2provider/prebuiltui";
import EmailPassword, {
  EmailPasswordComponentsOverrideProvider,
} from "supertokens-auth-react/recipe/emailpassword";
import { EmailPasswordPreBuiltUI } from "supertokens-auth-react/recipe/emailpassword/prebuiltui";

import SuperTokens from "supertokens-auth-react";

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

export const styleOverride = `
[data-supertokens~=tenants-link] {
    margin-top: 8px;
}
`;

export const SuperTokensConfig = {
  appInfo: {
    appName: "SuperTokens Demo App",
    apiDomain: getApiDomain(),
    websiteDomain: getWebsiteDomain(),
    apiBasePath: "/auth",
    websiteBasePath: "/auth",
  },
  style: styleOverride,

  recipeList: [
    Passwordless.init({
      contactMethod: "EMAIL",
      override: {
        functions: (originalImplementation) => {
          return {
            ...originalImplementation,
          };
        },
      },
      preAPIHook: async (context) => {
        const queryParams = new URLSearchParams(window.location.search);
        const updatedUrl = new URL(context.url);
        for (const [key, value] of queryParams) {
          updatedUrl.searchParams.set(key, value);
        }
        return {
          ...context,
          url: updatedUrl.toString(),
        };
      },
    }),
    OAuth2Provider.init(),
    Session.init(),
  ],
  getRedirectionURL: async (context) => {
    if (context.action === "SUCCESS" && context.recipeId === "passwordless") {
      const queryParams = new URLSearchParams(window.location.search);
      const redirectUrlResponse =
        await OAuth2Provider.getRedirectURLToContinueOAuthFlow({
          loginChallenge: queryParams.get("loginChallenge"),
        });

      if (redirectUrlResponse.status === "OK") {
        return redirectUrlResponse.frontendRedirectTo;
      }
    }
    return undefined;
  },
};

export const recipeDetails = {
  docsLink: "https://supertokens.com/docs/quickstart/introduction",
};

export const PreBuiltUIList = [
  PasswordlessPreBuiltUI,
  OAuth2ProviderPreBuiltUI,
];

export const ComponentWrapper = (props: {
  children: JSX.Element;
}): JSX.Element => {
  let childrenToRender = props.children;

  childrenToRender = (
    <PasswordlessComponentsOverrideProvider
      components={{
        PasswordlessUserInputCodeFormFooter_Override: ({
          DefaultComponent,
          ...cProps
        }) => {
          const loginAttemptInfo = cProps.loginAttemptInfo;
          let showQuotaMessage = false;

          if (loginAttemptInfo.contactMethod === "PHONE") {
            showQuotaMessage = true;
          }

          return (
            <div
              style={{
                width: "100%",
              }}
            >
              <DefaultComponent {...cProps} />
              {showQuotaMessage && (
                <div
                  style={{
                    width: "100%",
                    paddingLeft: 12,
                    paddingRight: 12,
                    paddingTop: 6,
                    paddingBottom: 6,
                    borderRadius: 4,
                    backgroundColor: "#EF9A9A",
                    margin: 0,
                    boxSizing: "border-box",
                    MozBoxSizing: "border-box",
                    WebkitBoxSizing: "border-box",
                    fontSize: 12,
                    textAlign: "start",
                    fontWeight: "bold",
                    lineHeight: "18px",
                  }}
                >
                  There is a daily quota for the free SMS service, if you do not
                  receive the SMS please try again tomorrow.
                </div>
              )}
            </div>
          );
        },
      }}
    >
      {props.children}
    </PasswordlessComponentsOverrideProvider>
  );
  return childrenToRender;
};
