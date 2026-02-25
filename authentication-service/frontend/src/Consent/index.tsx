import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export default function Consent() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consentData, setConsentData] = useState<{
    consentChallenge: string;
    redirectTo: string;
    requestedScopes: string[];
    clientName: string;
    clientId: string;
  } | null>(null);

  const [selectedAccount, setSelectedAccount] = useState("account-1");

  const consentChallenge = searchParams.get("consent_challenge");
  const redirectTo = searchParams.get("redirect_to");

  useEffect(() => {
    async function fetchConsentDetails() {
      if (!consentChallenge) {
        setError("Missing consent challenge");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_DOMAIN || "http://localhost:3001"}/auth/oauth/consent?consent_challenge=${consentChallenge}&redirect_to=${encodeURIComponent(redirectTo || "")}`,
        );
        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          setConsentData(data);
        }
      } catch (err) {
        setError("Failed to load consent details");
      } finally {
        setLoading(false);
      }
    }

    fetchConsentDetails();
  }, [consentChallenge, redirectTo]);

  const handleAccept = async () => {
    if (!consentData) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_DOMAIN || "http://localhost:3001"}/auth/oauth/accept-consent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            consentChallenge: consentData.consentChallenge,
            accountId: selectedAccount,
            redirectTo: consentData.redirectTo,
          }),
        },
      );

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
      } else {
        // Redirect to the OAuth client
        window.location.href = data.redirectUri;
      }
    } catch (err) {
      setError("Failed to accept consent");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="consent-container">
        <div className="spinner">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="consent-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="consent-container">
      <div className="consent-card">
        <h2>Authorize Access</h2>
        <p className="client-info">
          <strong>{consentData?.clientName}</strong> is requesting access to
          your account
        </p>

        <div className="scopes">
          <h3>Requested permissions:</h3>
          <ul>
            {consentData?.requestedScopes.map((scope) => (
              <li key={scope}>{scope}</li>
            ))}
          </ul>
        </div>

        <div className="account-selection">
          <h3>Select Account:</h3>
          <div className="account-options">
            <label
              className={`account-option ${selectedAccount === "account-1" ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="account"
                value="account-1"
                checked={selectedAccount === "account-1"}
                onChange={(e) => setSelectedAccount(e.target.value)}
              />
              <span>Account 1 (Primary)</span>
            </label>
            <label
              className={`account-option ${selectedAccount === "account-2" ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="account"
                value="account-2"
                checked={selectedAccount === "account-2"}
                onChange={(e) => setSelectedAccount(e.target.value)}
              />
              <span>Account 2 (Secondary)</span>
            </label>
          </div>
        </div>

        <div className="consent-actions">
          <button
            className="accept-btn"
            onClick={handleAccept}
            disabled={loading}
          >
            {loading ? "Processing..." : "Authorize"}
          </button>
        </div>
      </div>

      <style>{`
        .consent-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          padding: 20px;
        }

        .consent-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 32px;
          max-width: 480px;
          width: 100%;
        }

        .consent-card h2 {
          margin: 0 0 16px;
          color: #333;
        }

        .client-info {
          color: #666;
          margin-bottom: 24px;
        }

        .scopes {
          margin-bottom: 24px;
        }

        .scopes h3 {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }

        .scopes ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .scopes li {
          background: #f5f5f5;
          padding: 8px 12px;
          border-radius: 4px;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .account-selection {
          margin-bottom: 24px;
        }

        .account-selection h3 {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }

        .account-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .account-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .account-option:hover {
          border-color: #ccc;
        }

        .account-option.selected {
          border-color: #007cff;
          background: #f0f7ff;
        }

        .account-option input {
          margin: 0;
        }

        .consent-actions {
          display: flex;
          justify-content: flex-end;
        }

        .accept-btn {
          background: #007cff;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .accept-btn:hover:not(:disabled) {
          background: #0066dd;
        }

        .accept-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .spinner {
          color: #666;
        }

        .error {
          color: #dc3545;
        }
      `}</style>
    </div>
  );
}
