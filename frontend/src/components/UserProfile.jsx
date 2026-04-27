/**
 * UserProfile.jsx
 * Slide-in drawer showing the logged-in user's bookings + orders.
 * Bookings have a "Reschedule" button (only allowed if >3 hrs before session).
 * Uses: GET /api/me, GET /api/me/bookings, GET /api/me/orders
 *       POST /api/me/bookings/{id}/reschedule
 */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  ShoppingBag,
  Clock,
  RefreshCw,
  LogOut,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Package,
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

/* ── auth helpers ──────────────────────────────────────────────────── */
function getToken() {
  return localStorage.getItem("ga_token");
}

async function authFetch(path, opts = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    // token expired — clear it
    localStorage.removeItem("ga_token");
    localStorage.removeItem("ga_user");
    window.location.reload();
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) throw new Error(data.detail || "Something went wrong");
  return data;
}

/* ── simple date formatter ─────────────────────────────────────────── */
function fmtDate(str) {
  if (!str) return "—";
  try {
    return new Date(str).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return str;
  }
}

function fmtMoney(amt) {
  if (amt == null) return "—";
  return `₹${Number(amt).toLocaleString("en-IN")}`;
}

/* ── status badge ──────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    confirmed: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-700",
    rescheduled: "bg-blue-100 text-blue-700",
    completed: "bg-lavender/30 text-lavender-deep",
    delivered: "bg-green-100 text-green-700",
    processing: "bg-yellow-100 text-yellow-700",
    shipped: "bg-blue-100 text-blue-700",
  };
  const cls = map[status?.toLowerCase()] || "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${cls}`}
    >
      {status || "unknown"}
    </span>
  );
}

/* ── reschedule mini-form ──────────────────────────────────────────── */
const TIME_SLOTS = [
  "9:00 AM","10:00 AM","11:00 AM","12:00 PM",
  "1:00 PM","2:00 PM","3:00 PM","4:00 PM",
  "5:00 PM","6:00 PM","7:00 PM","8:00 PM",
];

function RescheduleForm({ bookingId, onSuccess, onCancel }) {
  const [newDate, setNewDate] = useState("");
  const [newSlot, setNewSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate || !newSlot) return;
    setError("");
    setLoading(true);
    try {
      await authFetch(`/api/me/bookings/${bookingId}/reschedule`, {
        method: "POST",
        body: JSON.stringify({ new_date: newDate, new_slot: newSlot }),
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={handleSubmit}
      className="mt-3 p-4 bg-ivory-deep rounded-xl border border-peach/30 space-y-3"
    >
      <p className="text-xs font-semibold text-lavender-deep uppercase tracking-wide">
        Pick a new date & time
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-lavender-dusty mb-1 block">Date</label>
          <input
            type="date"
            min={minDateStr}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            required
            className="w-full text-sm px-3 py-2 rounded-lg border border-peach/30 bg-white
                       text-ink-plum focus:outline-none focus:border-lavender-deep transition"
          />
        </div>
        <div>
          <label className="text-[11px] text-lavender-dusty mb-1 block">Time slot</label>
          <select
            value={newSlot}
            onChange={(e) => setNewSlot(e.target.value)}
            required
            className="w-full text-sm px-3 py-2 rounded-lg border border-peach/30 bg-white
                       text-ink-plum focus:outline-none focus:border-lavender-deep transition"
          >
            <option value="">Select…</option>
            {TIME_SLOTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-xs flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !newDate || !newSlot}
          className="flex-1 flex items-center justify-center gap-1.5 bg-lavender-deep text-ivory
                     rounded-lg py-2 text-xs font-medium hover:bg-lavender-deeper transition disabled:opacity-60"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Confirm Reschedule
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded-lg border border-peach/40 text-xs text-lavender-deep
                     hover:bg-peach/10 transition"
        >
          Cancel
        </button>
      </div>
    </motion.form>
  );
}

/* ── booking card ──────────────────────────────────────────────────── */
function BookingCard({ booking, onReschedule }) {
  const [reschedOpen, setReschedOpen] = useState(false);
  const [rescheduled, setRescheduled] = useState(false);

  // compute if reschedule is still allowed (>3 hrs before session)
  const canReschedule = (() => {
    if (!booking.booking_date || !booking.booking_slot) return false;
    if (["cancelled", "completed"].includes(booking.status?.toLowerCase())) return false;
    try {
      const [time, meridiem] = booking.booking_slot.split(" ");
      let [h, m] = time.split(":").map(Number);
      if (meridiem === "PM" && h !== 12) h += 12;
      if (meridiem === "AM" && h === 12) h = 0;
      const [year, month, day] = booking.booking_date.split("-").map(Number);
      const sessionDt = new Date(year, month - 1, day, h, m || 0);
      const hoursLeft = (sessionDt - Date.now()) / 3600000;
      return hoursLeft > 3;
    } catch {
      return false;
    }
  })();

  const handleRescheduleSuccess = () => {
    setReschedOpen(false);
    setRescheduled(true);
    onReschedule?.();
  };

  return (
    <div className="bg-white rounded-2xl border border-peach/20 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-ink-plum text-sm truncate">
            {booking.service_name || booking.service || "Reading Session"}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <span className="flex items-center gap-1 text-xs text-lavender-dusty">
              <Calendar size={11} />
              {fmtDate(booking.booking_date)}
            </span>
            {booking.booking_slot && (
              <span className="flex items-center gap-1 text-xs text-lavender-dusty">
                <Clock size={11} />
                {booking.booking_slot}
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={rescheduled ? "rescheduled" : booking.status} />
      </div>

      {booking.amount && (
        <p className="text-xs text-lavender-dusty mt-1.5">
          Paid: <span className="font-semibold text-ink-plum">{fmtMoney(booking.amount)}</span>
        </p>
      )}

      {/* reschedule button */}
      {canReschedule && !rescheduled && (
        <div className="mt-3">
          {!reschedOpen ? (
            <button
              onClick={() => setReschedOpen(true)}
              className="flex items-center gap-1.5 text-xs text-lavender-deep hover:text-lavender-deeper
                         font-medium transition"
            >
              <RefreshCw size={12} />
              Reschedule this session
            </button>
          ) : (
            <AnimatePresence>
              <RescheduleForm
                bookingId={booking.id || booking._id}
                onSuccess={handleRescheduleSuccess}
                onCancel={() => setReschedOpen(false)}
              />
            </AnimatePresence>
          )}
        </div>
      )}

      {rescheduled && (
        <p className="mt-2 flex items-center gap-1 text-xs text-green-600 font-medium">
          <CheckCircle2 size={12} />
          Reschedule request sent!
        </p>
      )}

      {!canReschedule && !["cancelled", "completed"].includes(booking.status?.toLowerCase()) &&
        booking.booking_date && (
          <p className="mt-2 text-[11px] text-lavender-dusty/70">
            Reschedule window has closed (must be &gt;3 hrs before session).
          </p>
        )}
    </div>
  );
}

/* ── order card ────────────────────────────────────────────────────── */
function OrderCard({ order }) {
  return (
    <div className="bg-white rounded-2xl border border-peach/20 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-ink-plum text-sm truncate">
            Order #{(order.id || order._id || "").slice(-6).toUpperCase()}
          </p>
          <p className="text-xs text-lavender-dusty mt-0.5">
            {fmtDate(order.created_at)}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* items */}
      {order.items?.length > 0 && (
        <ul className="mt-2 space-y-1">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center justify-between text-xs text-ink-plum/80">
              <span className="truncate max-w-[65%]">
                {item.name || item.product_name} × {item.qty || item.quantity || 1}
              </span>
              <span className="font-medium">{fmtMoney(item.price * (item.qty || item.quantity || 1))}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 pt-2 border-t border-peach/15 flex items-center justify-between">
        <span className="text-xs text-lavender-dusty">Total</span>
        <span className="font-semibold text-sm text-ink-plum">
          {fmtMoney(order.total || order.amount)}
        </span>
      </div>
    </div>
  );
}

/* ── tabs ──────────────────────────────────────────────────────────── */
function Tab({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium
                  rounded-xl transition ${
                    active
                      ? "bg-lavender-deep text-ivory shadow-soft"
                      : "text-lavender-dusty hover:text-lavender-deep"
                  }`}
    >
      <Icon size={14} />
      {label}
      {count != null && (
        <span
          className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold
                      ${active ? "bg-white/25" : "bg-lavender/30 text-lavender-deep"}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ── main drawer ───────────────────────────────────────────────────── */
export default function UserProfile({ open, onClose, onLogout }) {
  const [tab, setTab] = useState("bookings");
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState("");

  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const data = await authFetch("/api/me/bookings");
      setBookings(Array.isArray(data) ? data : data.bookings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const data = await authFetch("/api/me/orders");
      setOrders(Array.isArray(data) ? data : data.orders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    // load user from cache
    const cached = localStorage.getItem("ga_user");
    if (cached) {
      try { setUser(JSON.parse(cached)); } catch {}
    }
    setError("");
    fetchBookings();
    fetchOrders();
  }, [open, fetchBookings, fetchOrders]);

  const handleLogout = () => {
    localStorage.removeItem("ga_token");
    localStorage.removeItem("ga_user");
    onLogout?.();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[55] flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* backdrop */}
          <motion.div
            className="absolute inset-0 bg-ink-plum/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* drawer */}
          <motion.div
            className="relative w-full max-w-sm h-full bg-ivory shadow-glow flex flex-col overflow-hidden"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
          >
            {/* header */}
            <div className="bg-gradient-to-br from-lavender-deep to-ink-plum px-6 pt-6 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-xl italic text-ivory">
                    {user?.name ? `Hi, ${user.name.split(" ")[0]} ✨` : "My Account"}
                  </p>
                  <p className="text-ivory/65 text-xs mt-0.5">{user?.email || ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-ivory/70 hover:text-ivory text-xs transition"
                    title="Sign out"
                  >
                    <LogOut size={14} />
                  </button>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15
                               hover:bg-white/25 text-ivory transition"
                    aria-label="Close"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* tabs */}
              <div className="mt-4 flex gap-2 bg-white/10 rounded-xl p-1">
                <Tab
                  active={tab === "bookings"}
                  onClick={() => setTab("bookings")}
                  icon={Calendar}
                  label="Bookings"
                  count={bookings.length || null}
                />
                <Tab
                  active={tab === "orders"}
                  onClick={() => setTab("orders")}
                  icon={ShoppingBag}
                  label="Orders"
                  count={orders.length || null}
                />
              </div>
            </div>

            {/* content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle size={15} />
                  {error}
                </div>
              )}

              <AnimatePresence mode="wait">
                {/* ── Bookings tab ── */}
                {tab === "bookings" && (
                  <motion.div
                    key="bookings"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-3"
                  >
                    {loadingBookings ? (
                      <div className="flex flex-col items-center py-12 gap-3 text-lavender-dusty">
                        <Loader2 size={24} className="animate-spin" />
                        <p className="text-sm">Loading bookings…</p>
                      </div>
                    ) : bookings.length === 0 ? (
                      <div className="flex flex-col items-center py-12 gap-3 text-lavender-dusty">
                        <Calendar size={36} strokeWidth={1.2} />
                        <p className="text-sm text-center">
                          No bookings yet.
                          <br />
                          <a href="#services" onClick={onClose} className="text-lavender-deep hover:underline">
                            Book a reading
                          </a>{" "}
                          to get started!
                        </p>
                      </div>
                    ) : (
                      bookings.map((b, i) => (
                        <BookingCard
                          key={b.id || b._id || i}
                          booking={b}
                          onReschedule={fetchBookings}
                        />
                      ))
                    )}
                  </motion.div>
                )}

                {/* ── Orders tab ── */}
                {tab === "orders" && (
                  <motion.div
                    key="orders"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-3"
                  >
                    {loadingOrders ? (
                      <div className="flex flex-col items-center py-12 gap-3 text-lavender-dusty">
                        <Loader2 size={24} className="animate-spin" />
                        <p className="text-sm">Loading orders…</p>
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="flex flex-col items-center py-12 gap-3 text-lavender-dusty">
                        <Package size={36} strokeWidth={1.2} />
                        <p className="text-sm text-center">
                          No orders yet.
                          <br />
                          <a href="#shop" onClick={onClose} className="text-lavender-deep hover:underline">
                            Visit the shop
                          </a>{" "}
                          to explore!
                        </p>
                      </div>
                    ) : (
                      orders.map((o, i) => (
                        <OrderCard key={o.id || o._id || i} order={o} />
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* footer */}
            <div className="border-t border-peach/20 px-6 py-4">
              <p className="text-[11px] text-lavender-dusty/60 text-center">
                Need help? WhatsApp us at{" "}
                <a
                  href="https://wa.me/918320135858"
                  target="_blank"
                  rel="noreferrer"
                  className="text-lavender-deep hover:underline"
                >
                  +91 83201 35858
                </a>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
