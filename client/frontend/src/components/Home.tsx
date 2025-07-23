import React from "react";

const Home: React.FC = () => {
  const handleLogin = (): void => {
    window.location.href = "http://localhost:3004/auth/oauth";
  };

  return (
    <div className="container">
      <h1>OAuth2 Example Application</h1>
      <p>Click the button below to authenticate with OAuth2</p>
      <button className="login-button" onClick={handleLogin}>
        Login with OAuth2
      </button>
    </div>
  );
};

export default Home;

