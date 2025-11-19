import React from "react";
import { useLocation, Link } from "react-router-dom";

export default function ConfirmEmail() {
  const location = useLocation();
  const email = location.state?.email;

  return (
    <div className="auth-page-root">
      <div className="auth-card p-10 text-center">
        <h1 className="text-3xl font-bold mb-4">Check Your Email</h1>

        <p className="mb-4">
          A confirmation link has been sent to:
        </p>

        <p className="font-semibold text-yellow-600 mb-8">
          {email}
        </p>

        <p className="text-gray-700">
          Click the link in your inbox to finish creating your account.
        </p>

        <div className="mt-8">
          <Link to="/login" className="text-yellow-500 underline">
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
