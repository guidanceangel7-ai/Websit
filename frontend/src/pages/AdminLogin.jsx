import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { BRAND } from "../lib/brand";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "../components/ui/sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/admin/login`, { username, password });
      localStorage.setItem("ga_admin_token", res.data.token);
      toast.success("Welcome back ✦");
      navigate("/admin");
    } catch (e) {
      toast.error("Invalid credentials");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory aurora-bg px-6">
      <Toaster richColors position="top-center" />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src={BRAND.logoRound}
            alt="Guidance Angel"
            className="w-16 h-16 mx-auto rounded-full ring-1 ring-peach/40"
          />
          <h1 className="font-display text-3xl mt-4 text-ink-plum">
            Admin Sanctum
          </h1>
          <p className="text-sm text-ink-plum/60 mt-1">
            Sign in to view bookings & journey insights.
          </p>
        </div>
        <form
          onSubmit={onSubmit}
          data-testid="admin-login-form"
          className="rounded-3xl bg-white/85 border border-peach/30 p-7 shadow-soft space-y-4"
        >
          <div>
            <label className="text-xs uppercase tracking-[0.22em] text-peach-deep">
              Username
            </label>
            <input
              data-testid="admin-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-2 w-full rounded-xl border border-peach/30 bg-white px-4 py-2.5 outline-none focus:border-lavender-deep focus:ring-2 focus:ring-peach/40"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.22em] text-peach-deep">
              Password
            </label>
            <input
              data-testid="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-peach/30 bg-white px-4 py-2.5 outline-none focus:border-lavender-deep focus:ring-2 focus:ring-peach/40"
              required
            />
          </div>
          <button
            data-testid="admin-login-submit"
            disabled={submitting}
            className="w-full inline-flex justify-center items-center bg-lavender-deep hover:bg-lavender-deeper text-ivory rounded-full px-6 py-3 text-sm font-medium transition disabled:opacity-70"
          >
            {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
            Sign in
          </button>
          <a
            href="/"
            className="block text-center text-xs text-ink-plum/60 hover:text-lavender-deep mt-2"
          >
            ← Back to website
          </a>
        </form>
      </div>
    </div>
  );
}
