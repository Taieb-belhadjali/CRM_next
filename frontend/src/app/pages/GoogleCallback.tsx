import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { googleOAuthCallback } from "../api";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("Google OAuth error:", error);
      navigate("/meetings");
      return;
    }

    if (!code || !token) {
      navigate("/meetings");
      return;
    }

    googleOAuthCallback(token, code)
      .then(() => navigate("/meetings"))
      .catch(() => navigate("/meetings"));
  }, [searchParams, navigate, token]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-zinc-50">
      <span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}
