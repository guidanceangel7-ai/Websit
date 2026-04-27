/**
 * LoginModal.jsx
 * Email → OTP → Logged-in flow for Guidance Angel
 * Uses: POST /api/auth/send-otp  →  POST /api/auth/verify-otp
 * Stores JWT in localStorage as "ga_token" and user info as "ga_user"
 */
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

/* ── tiny helper ───────────────────────────────────────────────────── */
async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Something went wrong");
  return data;
}

/* ── 6-box OTP input ───────────────────────────────────────────────── */
function OTPInput({ value, onChange, disabled }) {
  const boxes = useRef([]);
  const digits = value.split("");

  const handleKey = (i, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) {
        next[i] = "";
        onChange(next.join(""));
      } else if (i > 0) {
        next[i - 1] = "";
        onChange(next.join(""));
        boxes.current[i - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      boxes.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < 5) {
      boxes.current[i + 1]?.focus();
    }
  };

  const handleChange = (i, e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(-1);
    if (!raw) return;
    const next = [...digits];
    next[i] = raw;
    onChange(next.join(""));
    if (i < 5) boxes.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6));
    const focusIdx = Math.min(pasted.length, 5);
    boxes.current[focusIdx]?.focus();
  };

  return (
    <div className="flex justify-center gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (boxes.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ""}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className="w-11 h-12 text-center text-xl font-bold rounded-xl border-2 bg-white text-ink-plum
                     border-peach/40 focus:border-lavender-deep focus:outline-none transition
                     disabled:opacity-50 shadow-sm"
        />
      ))}
    </div>
  );
}

/* ── Main modal ────────────────────────────────────────────────────── */
export default function LoginModal({ open, onClose, onLoggedIn }) {
  const [step, setStep] = useState("email"); // "email" | "otp" | "success"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const emailRef = useRef(null);

  // auto-focus email field when modal opens
  useEffect(() => {
    if (open) {
      setStep("email");
      setEmail("");
      setOtp("");
      setError("");
      setCountdown(0);
      setTimeout(() => emailRef.current?.focus(), 100);
    }
  }, [open]);

  // resend cooldown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const sendOTP = async (e) => {
    e?.preventDefault();
    if (!email.trim()) return;
    setError("");
    setLoading(true);
    try {
      await apiFetch("/api/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setStep("otp");
      setCountdown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e) => {
    e?.preventDefault();
    if (otp.length < 6) return;
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      });
      // store token + user profile
      localStorage.setItem("ga_token", data.token);
      localStorage.setItem(
        "ga_user",
        JSON.stringify({
          email: data.email,
          name: data.name || "",
          phone: data.phone || "",
        })
      );
      setStep("success");
      setTimeout(() => {
        onLoggedIn?.(data);
        onClose();
      }, 1400);
    } catch (err) {
      setError(err.message);
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  // auto-submit when all 6 digits entered
  useEffect(() => {
    if (step === "otp" && otp.length === 6 && !loading) verifyOTP();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* backdrop */}
          <motion.div
            className="absolute inset-0 bg-ink-plum/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* card */}
          <motion.div
            className="relative w-full max-w-sm bg-ivory rounded-3xl shadow-glow overflow-hidden"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            {/* close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full
                         bg-peach/20 hover:bg-peach/40 text-ink-plum transition"
              aria-label="Close"
            >
              <X size={15} />
            </button>

            {/* header strip */}
            <div className="bg-gradient-to-br from-lavender-deep to-ink-plum px-8 pt-8 pb-6 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/15 mb-3">
                {step === "success" ? (
                  <CheckCircle2 size={28} className="text-peach" />
                ) : step === "otp" ? (
                  <ShieldCheck size={28} className="text-peach" />
                ) : (
                  <Mail size={28} className="text-peach" />
                )}
              </div>
              <h2 className="font-display text-2xl italic text-ivory">
                {step === "success"
                  ? "You're in!"
                  : step === "otp"
                  ? "Enter OTP"
                  : "Sign in"}
              </h2>
              <p className="text-ivory/70 text-sm mt-1">
                {step === "success"
                  ? "Welcome back ✨"
                  : step === "otp"
                  ? `We sent a 6-digit code to ${email}`
                  : "Login or create an account"}
              </p>
            </div>

            <div className="px-8 py-6">
              <AnimatePresence mode="wait">
                {/* ── Email step ── */}
                {step === "email" && (
                  <motion.form
                    key="email-step"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    onSubmit={sendOTP}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-medium text-lavender-deep mb-1.5 tracking-wide uppercase">
                        Email address
                      </label>
                      <input
                        ref={emailRef}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full px-4 py-3 rounded-xl border-2 border-peach/30 bg-white
                                   text-ink-plum placeholder-lavender-dusty/50 text-sm
                                   focus:outline-none focus:border-lavender-deep transition"
                      />
                    </div>

                    {error && (
                      <p className="text-red-500 text-xs text-center">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !email.trim()}
                      className="w-full flex items-center justify-center gap-2 bg-lavender-deep text-ivory
                                 rounded-xl py-3 text-sm font-medium hover:bg-lavender-deeper transition
                                 disabled:opacity-60"
                    >
                      {loading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        "Send OTP"
                      )}
                    </button>

                    <p className="text-center text-xs text-lavender-dusty">
                      No password needed — we'll email you a one-time code.
                    </p>
                  </motion.form>
                )}

                {/* ── OTP step ── */}
                {step === "otp" && (
                  <motion.form
                    key="otp-step"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    onSubmit={verifyOTP}
                    className="space-y-5"
                  >
                    <OTPInput value={otp} onChange={setOtp} disabled={loading} />

                    {error && (
                      <p className="text-red-500 text-xs text-center">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={loading || otp.length < 6}
                      className="w-full flex items-center justify-center gap-2 bg-lavender-deep text-ivory
                                 rounded-xl py-3 text-sm font-medium hover:bg-lavender-deeper transition
                                 disabled:opacity-60"
                    >
                      {loading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        "Verify & Sign In"
                      )}
                    </button>

                    <div className="flex items-center justify-between text-xs text-lavender-dusty">
                      <button
                        type="button"
                        onClick={() => {
                          setStep("email");
                          setOtp("");
                          setError("");
                        }}
                        className="hover:text-lavender-deep transition"
                      >
                        ← Change email
                      </button>
                      {countdown > 0 ? (
                        <span>Resend in {countdown}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={sendOTP}
                          disabled={loading}
                          className="hover:text-lavender-deep transition disabled:opacity-50"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </motion.form>
                )}

                {/* ── Success step ── */}
                {step === "success" && (
                  <motion.div
                    key="success-step"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-4 text-center"
                  >
                    <div className="text-4xl mb-2">✨</div>
                    <p className="text-lavender-deep font-medium">Signed in successfully</p>
                    <p className="text-sm text-lavender-dusty mt-1">Redirecting…</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
