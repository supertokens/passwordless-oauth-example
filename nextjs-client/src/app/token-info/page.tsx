"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function TokenInfoPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading token info...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-xl font-bold mb-3">Not signed in</h1>
          <p className="text-gray-600 mb-4">
            Sign in first to inspect account_id from the OAuth token.
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          OAuth Token Info
        </h1>
        <p className="text-gray-700 mb-4">
          Selected account from access token claim:
        </p>
        <div className="mb-6 p-3 rounded border bg-gray-50">
          <code>{session.accountId ?? "(missing account_id claim)"}</code>
        </div>

        <p className="text-gray-700 mb-2">Session object</p>
        <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-96">
          {JSON.stringify(session, null, 2)}
        </pre>

        <div className="mt-4">
          <Link
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
