/**
 * AdminLogin.jsx — No axios, no sonner. Pure fetch.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-[#E6DDF1] via-[#FBF4E8] to-[#F5EEF8] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-3xl border border-[#C8B6E2] shadow-2xl overflow-hidden"
      >
        <div className="bg-gradient-to-br from-[#6B5B95] to-[#9B8AC4] px-8 py-8 text-center text-white">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Lock size={24} />
          </div>
          <div className="font-display text-2xl italic">guidance angel</div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-yellow-200/80 mt-1">Admin Panel</div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#3A2E5D] uppercase tracking-widest mb-1.5">Username</label>
            <input
              className={inp}
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#3A2E5D] uppercase tracking-widest mb-1.5">Password</label>
            <div className="relative">
              <input
                className={`${inp} pr-10`}
                type={showPw ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B8AC4] hover:text-[#6B5B95]">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-200">{error}</p>
          )}

          <button type="submit" disabled={loading || !username || !password}
            className="w-full py-3 rounded-xl bg-[#6B5B95] text-white font-semibold text-sm hover:bg-[#5a4a84] transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            Sign In
          </button>

          <a href="/" className="block text-center text-xs text-[#9B8AC4] hover:text-[#6B5B95] mt-2 transition">
            ← Back to website
          </a>
        </form>
      </motion.div>
    </div>
  );
}
