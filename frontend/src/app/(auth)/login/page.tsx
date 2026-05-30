"use client";

/**
 * Login Page — /login
 * =====================
 * The entry point for all users. Redirects to the appropriate dashboard
 * based on the user's role after successful login.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api";
import { Bus, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authApi.login(username, password);
      const { access_token, user } = response.data;

      // Store user + token in Zustand (persisted to localStorage)
      login(user, access_token);

      // Redirect based on role
      if (user.role === "driver" || user.role === "conductor") {
        router.push("/driver");          // Mobile PWA
      } else {
        router.push("/dashboard");       // Desktop dashboard
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 429) {
        setError("Too many login attempts. Please wait 15 minutes.");
      } else {
        setError(detail || "Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500 flex items-center justify-center p-4">
      
      {/* Login Card */}
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
            <Bus className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">NCRTC Bus Management</h1>
          <p className="text-primary-200 mt-1 text-sm">Feeder Bus Operations System</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign in to your account</h2>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                placeholder="e.g. driver1"
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pr-10"
                  placeholder="Your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 h-11"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : "Sign In"}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-medium text-amber-800 mb-1">⚠️ Demo Credentials</p>
            <div className="text-xs text-amber-700 space-y-0.5 font-mono">
              <p>admin / password</p>
              <p>manager1 / password</p>
              <p>operator1 / password</p>
              <p>driver1 / password</p>
            </div>
          </div>
        </div>

        <p className="text-center text-primary-300 text-xs mt-6">
          NCRTC BMS v1.0 · Student Project · NSUT Delhi
        </p>
      </div>
    </div>
  );
}
