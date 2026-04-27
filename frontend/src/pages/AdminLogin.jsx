/**
 * AdminLogin.jsx — No axios, no sonner. Pure fetch.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Lock, Eye, EyeOff, Sparkles } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || "Invalid credentials");
        return;
      }
      localStorage.setItem("admin_token", data.token);
      navigate("/admin");
    } catch {
      setError("Could not reach server. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const inp = "w-full rounded-xl border border-[#C8B6E2] bg-white/80 px-4 py-3 text-sm text-[#3A2E5D] placeholder:text-[#9B8AC4]/60 focus:outline-none focus:ring-2 focus:ring-[#6B5B95]";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3A2E5D] via-[#6B5B95] to-[#9B8AC4] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorative blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#EBB99A]/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#F4C6D6]/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm relative"
      >
        {/* Brand logo card */}
        <div className="text-center mb-6">
          {/* Logo mark */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.3)] mb-4">
            <span className="font-display text-3xl italic text-white leading-none">g</span>
          </div>
          {/* Brand name */}
          <div className="font-display text-3xl italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
            guidance angel
          </div>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <div className="h-px w-8 bg-[#EBB99A]/60" />
            <span className="text-[10px] tracking-[0.4em] uppercase text-[#EBB99A]/90 font-semibold">Sacred Shop</span>
            <div className="h-px w-8 bg-[#EBB99A]/60" />
          </div>
        </div>

        {/* Login card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-white/40 shadow-[0_24px_60px_rgba(0,0,0,0.35)] overflow-hidden">
          {/* Card header */}
          <div className="bg-gradient-to-r from-[#F5EEF8] to-[#E6DDF1] px-8 py-5 border-b border-[#C8B6E2]/40 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#6B5B95]/10 flex items-center justify-center">
              <Lock size={16} className="text-[#6B5B95]" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#3A2E5D]">Admin Panel</div>
              <div className="text-[11px] text-[#9B8AC4]">Sign in to manage your shop</div>
            </div>
            <Sparkles size={16} className="ml-auto text-[#EBB99A]" />
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#3A2E5D] uppercase tracking-widest mb-1.5">
                Username
              </label>
              <input
                className={inp}
                placeholder="your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3A2E5D] uppercase tracking-widest mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  className={`${inp} pr-11`}
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B8AC4] hover:text-[#6B5B95] transition">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-200 flex items-center gap-2"
              >
                <span className="text-red-400">✕</span> {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6B5B95] to-[#9B8AC4] text-white font-semibold text-sm hover:from-[#5a4a84] hover:to-[#6B5B95] transition shadow-[0_4px_14px_rgba(107,91,149,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
              Sign In to Admin
            </button>

            <a href="/" className="block text-center text-xs text-[#9B8AC4] hover:text-[#6B5B95] transition pt-1">
              ← Back to guidanceangel7.com
            </a>
          </form>
        </div>

        {/* Bottom tagline */}
        <p className="text-center text-white/40 text-[11px] mt-4">
          ✦ Secure admin access only ✦
        </p>
      </motion.div>
    </div>
  );
}
