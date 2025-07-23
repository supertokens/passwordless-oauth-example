"use client";

import Passwordless, {
  PasswordlessComponentsOverrideProvider,
} from "supertokens-auth-react/recipe/passwordless";
import { PasswordlessPreBuiltUI } from "supertokens-auth-react/recipe/passwordless/prebuiltui";
import Session from "supertokens-auth-react/recipe/session";
import OAuth2Provider from "supertokens-auth-react/recipe/oauth2provider";
import { OAuth2ProviderPreBuiltUI } from "supertokens-auth-react/recipe/oauth2provider/prebuiltui";
import { useEffect } from "react";

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
            // Save the oauth login challenge in order to be able
            // to access it when the user opens the magic link
            setLoginAttemptInfo: (input) => {
              const queryParams = new URLSearchParams(window.location.search);
              const loginChallenge = queryParams.get("loginChallenge");
              return originalImplementation.setLoginAttemptInfo({
                ...input,
                attemptInfo: {
                  loginChallenge,
                  ...input.attemptInfo,
                },
              });
            },
            // Access the saved login challenge and persist it in the URL
            // This is required because after the passwordless flow is completed
            // the loginAttemptInfo data gets cleared
            consumeCode: async (input) => {
              const attemptInfo = await Passwordless.getLoginAttemptInfo();
              const loginChallenge = attemptInfo.loginChallenge;
              const urlParams = new URLSearchParams(window.location.search);
              urlParams.set("loginChallenge", loginChallenge);
              window.history.pushState(
                {},
                "",
                window.location.pathname + "?" + urlParams.toString(),
              );
              return await originalImplementation.consumeCode(input);
            },
          };
        },
      },
    }),
    OAuth2Provider.init(),
    Session.init(),
  ],
  // Redirect the user based on the OAuth2 state
  getRedirectionURL: async (context) => {
    if (context.action === "SUCCESS" && context.recipeId === "passwordless") {
      const attemptInfo = await Passwordless.getLoginAttemptInfo();
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

// Use this override if you want to force the user
// to return to the original tab after they have accessed the magic link
export const ComponentWrapper = (props: {
  children: JSX.Element;
}): JSX.Element => {
  let childrenToRender = props.children;

  childrenToRender = (
    <PasswordlessComponentsOverrideProvider
      components={{
        PasswordlessLinkSent_Override: ({ DefaultComponent, ...props }) => {
          useEffect(() => {
            const onVisibilityChange = async (e) => {
              if (document.hidden) return;
              const loginAttemptInfo = await Passwordless.getLoginAttemptInfo();
              const queryParams = new URLSearchParams(window.location.search);
              // If the user returns to the original tab
              // redirect them to a page that informs them about the authentication state
              // or tells them to close the tab
              if (!loginAttemptInfo) {
                window.location.href = "/dashboard";
              }
              // Otherwise you can make use of this page to complete the OAuth2 flow
              // when the user returns to it
              // if (loginAttemptInfo) return;
              // const redirectUrlResponse =
              //   await OAuth2Provider.getRedirectURLToContinueOAuthFlow({
              //     loginChallenge: queryParams.get("loginChallenge"),
              //   });
              // window.location.href = redirectUrlResponse.frontendRedirectTo;
            };
            document.addEventListener("visibilitychange", onVisibilityChange);
            return () => {
              document.removeEventListener(
                "visibilitychange",
                onVisibilityChange,
              );
            };
          }, []);
          return <DefaultComponent {...props} />;
        },
      }}
    >
      {props.children}
    </PasswordlessComponentsOverrideProvider>
  );
  return childrenToRender;
};
