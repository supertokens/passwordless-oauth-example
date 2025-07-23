import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserProfile, ApiResponse } from "../types";

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async (): Promise<void> => {
    try {
      const response = await fetch("http://localhost:3004/api/user", {
        credentials: "include",
      });

      if (response.ok) {
        const data: ApiResponse<UserProfile> = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          setError("Failed to fetch user information");
          navigate("/");
        }
      } else {
        setError("Not authenticated");
        navigate("/");
      }
    } catch (err) {
      setError("Error fetching user information");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      const response = await fetch("http://localhost:3004/logout", {
        credentials: "include",
      });

      if (response.ok) {
        navigate("/");
      } else {
        console.error("Logout failed");
      }
    } catch (err) {
      console.error("Error during logout:", err);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <p className="loading">Loading user information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h1>Error</h1>
        <p>{error}</p>
        <button className="login-button" onClick={() => navigate("/")}>
          Go Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Welcome to Your Dashboard!</h1>
      <button className="logout-button" onClick={handleLogout}>
        Logout
      </button>

      {user && (
        <div className="user-info">
          <h3>User Information</h3>
          <p>
            <strong>User ID:</strong> {user.sub}
          </p>
          {user.email && (
            <p>
              <strong>Email:</strong> {user.email}
            </p>
          )}
          {user.name && (
            <p>
              <strong>Name:</strong> {user.name}
            </p>
          )}
          {user.preferred_username && (
            <p>
              <strong>Username:</strong> {user.preferred_username}
            </p>
          )}

          <h4>Full Profile Data:</h4>
          <pre
            style={{
              textAlign: "left",
              background: "#f0f0f0",
              padding: "10px",
              borderRadius: "4px",
            }}
          >
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

