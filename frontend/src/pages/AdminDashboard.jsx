/**
 * AdminDashboard.jsx — Guidance Angel Admin Panel
 * Uses ONLY: React, framer-motion, lucide-react (all pre-installed)
 * No axios, no sonner — pure fetch API + inline Toast
 * Features: category cover image upload with CROP, variants panel, product image upload with CROP
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart2, BookOpen, Package, Tag, LogOut, RefreshCw, Loader2,
  X, Plus, Trash2, Download, Sparkles, ShoppingBag, Check,
  Layers, ChevronDown, ChevronUp, ImagePlus, FolderOpen, Edit2,
  ZoomIn, ZoomOut, Move, Crop, RotateCcw,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

// ── Auth helpers ─────────────────────────────────────────────────────────────
function token() { return localStorage.getItem("admin_token") || ""; }
function authH()  { return { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" }; }

async function adminFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { headers: authH(), ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

// Resolve image URL — prefix /api/ paths with BACKEND_URL
function resolveImg(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("data:")) return url;
  if (url.startsWith("/api/")) return `${BACKEND}${url}`;
  return url;
}

// ── Inline Toast ─────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  const el = (
    <div className="fixed top-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id}
          className={`px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 ${
            t.type === "error" ? "bg-red-600 text-white" : "bg-[#3A2E5D] text-[#FBF4E8]"
          }`}>
          {t.type === "error" ? <X size={13} /> : <Check size={13} />}
          {t.msg}
        </div>
      ))}
    </div>
  );
  return { show, el };
}

// ── File → base64 ────────────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// IMAGE CROP DIALOG
// ════════════════════════════════════════════════════════════════════════════
/**
 * Shows the uploaded image with a draggable crop rectangle.
 * Corners are resizable. Canvas extracts the final crop.
 * onCrop(base64string) is called when user clicks "Apply Crop".
 */
function CropDialog({ src, onCrop, onCancel }) {
  const containerRef = useRef(null);
  const imgRef       = useRef(null);
  const canvasRef    = useRef(null);

  // crop rect in % of displayed image (0–100)
  const [box, setBox]         = useState({ x: 10, y: 10, w: 80, h: 80 });
  const [drag, setDrag]       = useState(null);   // { type, startX, startY, startBox }
  const [zoom, setZoom]       = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast]     = useState(100);
  const [imgLoaded, setImgLoaded]   = useState(false);

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  // Mouse / touch helpers
  const getPos = (e, container) => {
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width)  * 100,
      y: ((clientY - rect.top)  / rect.height) * 100,
    };
  };

  const onMouseDown = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const pos = getPos(e, container);
    setDrag({ type, startX: pos.x, startY: pos.y, startBox: { ...box } });
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e) => {
      const container = containerRef.current;
      if (!container) return;
      const pos = getPos(e, container);
      const dx = pos.x - drag.startX;
      const dy = pos.y - drag.startY;
      const b  = drag.startBox;

      setBox((prev) => {
        let { x, y, w, h } = b;
        if (drag.type === "move") {
          x = clamp(b.x + dx, 0, 100 - b.w);
          y = clamp(b.y + dy, 0, 100 - b.h);
        } else if (drag.type === "se") {
          w = clamp(b.w + dx, 10, 100 - b.x);
          h = clamp(b.h + dy, 10, 100 - b.y);
        } else if (drag.type === "sw") {
          const newX = clamp(b.x + dx, 0, b.x + b.w - 10);
          w = b.x + b.w - newX;
          x = newX;
          h = clamp(b.h + dy, 10, 100 - b.y);
        } else if (drag.type === "ne") {
          w = clamp(b.w + dx, 10, 100 - b.x);
          const newY = clamp(b.y + dy, 0, b.y + b.h - 10);
          h = b.y + b.h - newY;
          y = newY;
        } else if (drag.type === "nw") {
          const newX = clamp(b.x + dx, 0, b.x + b.w - 10);
          w = b.x + b.w - newX;
          x = newX;
          const newY = clamp(b.y + dy, 0, b.y + b.h - 10);
          h = b.y + b.h - newY;
          y = newY;
        }
        return { x, y, w, h };
      });
    };
    const up = () => setDrag(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [drag]);

  const applyCrop = () => {
    const img    = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const cx = (box.x / 100) * nw;
    const cy = (box.y / 100) * nh;
    const cw = (box.w / 100) * nw;
    const ch = (box.h / 100) * nh;
    canvas.width  = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
    onCrop(canvas.toDataURL("image/jpeg", 0.92));
  };

  const resetBox = () => setBox({ x: 10, y: 10, w: 80, h: 80 });

  const handleH = "absolute w-4 h-4 bg-white border-2 border-[#6B5B95] rounded-full -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 shadow-md";

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6DDF1] flex-shrink-0">
          <div>
            <p className="font-semibold text-[#3A2E5D] text-sm flex items-center gap-2"><Crop size={15} /> Crop &amp; Adjust Image</p>
            <p className="text-[11px] text-[#9B8AC4] mt-0.5">Drag the crop area · Drag corners to resize · Adjust brightness &amp; contrast</p>
          </div>
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-[#F5EEF8] text-[#9B8AC4] transition"><X size={16} /></button>
        </div>

        {/* Image + crop overlay */}
        <div className="overflow-auto flex-1 p-4 bg-[#1a1a2e] flex items-center justify-center">
          <div
            ref={containerRef}
            className="relative select-none"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center", maxWidth: "100%" }}
          >
            <img
              ref={imgRef}
              src={src}
              alt="crop-preview"
              className="block max-w-full max-h-[50vh] object-contain"
              style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
              onLoad={() => setImgLoaded(true)}
              draggable={false}
            />

            {imgLoaded && (
              <div className="absolute inset-0">
                {/* Dark overlay — 4 quadrants around the crop box */}
                <div className="absolute inset-0 bg-black/50 pointer-events-none" style={{
                  clipPath: `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% ${box.y}%, ${box.x}% ${box.y}%, ${box.x}% ${box.y + box.h}%, 0% ${box.y + box.h}%, 0% 100%, ${box.x + box.w}% 100%, ${box.x + box.w}% ${box.y}%, ${box.x}% ${box.y}%)`
                }} />

                {/* Crop box border */}
                <div
                  className="absolute border-2 border-white/90 cursor-move"
                  style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
                  onMouseDown={(e) => onMouseDown(e, "move")}
                  onTouchStart={(e) => onMouseDown(e, "move")}
                >
                  {/* Rule-of-thirds grid */}
                  <div className="absolute inset-0 pointer-events-none" style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
                    backgroundSize: "33.3% 33.3%"
                  }} />
                </div>

                {/* Corner handles */}
                {[
                  { type: "nw", style: { left: `${box.x}%`, top: `${box.y}%`, cursor: "nw-resize" } },
                  { type: "ne", style: { left: `${box.x + box.w}%`, top: `${box.y}%`, cursor: "ne-resize" } },
                  { type: "sw", style: { left: `${box.x}%`, top: `${box.y + box.h}%`, cursor: "sw-resize" } },
                  { type: "se", style: { left: `${box.x + box.w}%`, top: `${box.y + box.h}%`, cursor: "se-resize" } },
                ].map(({ type, style }) => (
                  <div key={type} className={handleH} style={style}
                    onMouseDown={(e) => onMouseDown(e, type)}
                    onTouchStart={(e) => onMouseDown(e, type)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-t border-[#E6DDF1] flex-shrink-0 space-y-3">
          {/* Zoom & brightness/contrast sliders */}
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-[#9B8AC4] font-medium mb-1 flex items-center gap-1"><ZoomIn size={11} /> Zoom</p>
              <input type="range" min="0.5" max="3" step="0.1" value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-[#6B5B95]" />
              <p className="text-[#9B8AC4] text-center mt-0.5">{Math.round(zoom * 100)}%</p>
            </div>
            <div>
              <p className="text-[#9B8AC4] font-medium mb-1">☀ Brightness</p>
              <input type="range" min="50" max="200" step="5" value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value))}
                className="w-full accent-[#6B5B95]" />
              <p className="text-[#9B8AC4] text-center mt-0.5">{brightness}%</p>
            </div>
            <div>
              <p className="text-[#9B8AC4] font-medium mb-1">◑ Contrast</p>
              <input type="range" min="50" max="200" step="5" value={contrast}
                onChange={(e) => setContrast(parseInt(e.target.value))}
                className="w-full accent-[#6B5B95]" />
              <p className="text-[#9B8AC4] text-center mt-0.5">{contrast}%</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={resetBox} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#C8B6E2] text-[#9B8AC4] text-xs hover:bg-[#F5EEF8] transition">
              <RotateCcw size={12} /> Reset crop
            </button>
            <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-[#C8B6E2] text-[#3A2E5D] text-sm hover:bg-[#F5EEF8] transition">
              Cancel
            </button>
            <button onClick={applyCrop} className="flex-1 py-2 rounded-xl bg-[#6B5B95] text-white text-sm font-semibold hover:bg-[#5a4a84] transition flex items-center justify-center gap-2">
              <Crop size={14} /> Apply &amp; Save
            </button>
          </div>
        </div>
      </div>
      {/* Hidden canvas for extracting crop */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "#6B5B95" }) {
  return (
    <div className="rounded-2xl bg-white/80 border border-[#C8B6E2] p-5 shadow-sm">
      <p className="text-[11px] uppercase tracking-widest text-[#9B8AC4] font-semibold">{label}</p>
      <p className="mt-1 font-display text-3xl" style={{ color }}>{value}</p>
      {sub && <p className="mt-1 text-xs text-[#3A2E5D]/60">{sub}</p>}
    </div>
  );
}

function StatusBadge({ value }) {
  const map = {
    paid: "bg-green-100 text-green-700", pending: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",   confirmed: "bg-blue-100 text-blue-700",
    completed: "bg-purple-100 text-purple-700", cancelled: "bg-gray-100 text-gray-500",
    shipped: "bg-cyan-100 text-cyan-700", delivered: "bg-teal-100 text-teal-700",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${map[value] || "bg-gray-100 text-gray-600"}`}>
      {value}
    </span>
  );
}

const inputCls = "w-full rounded-xl border border-[#C8B6E2] bg-white/80 px-3 py-2 text-sm text-[#3A2E5D] focus:outline-none focus:ring-2 focus:ring-[#6B5B95]";

// ════════════════════════════════════════════════════════════════════════════
// STATS TAB
// ════════════════════════════════════════════════════════════════════════════
function StatsTab({ toast }) {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback((p) => {
    setLoading(true);
    adminFetch(`/admin/stats?period=${p}`)
      .then(setStats)
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(period); }, [load, period]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-xl text-[#3A2E5D]">Dashboard Overview</h3>
        <div className="flex gap-1">
          {["week", "month", "year", "all"].map((p) => (
            <button key={p} onClick={() => { setPeriod(p); load(p); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${period === p ? "bg-[#6B5B95] text-white" : "bg-white border border-[#C8B6E2] text-[#3A2E5D] hover:bg-[#E6DDF1]"}`}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-[#6B5B95]" /></div>
      ) : stats ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Combined Revenue" value={`₹${(stats.combined_revenue_inr || 0).toLocaleString("en-IN")}`} color="#6B5B95" />
          <StatCard label="Total Bookings" value={stats.bookings?.total || 0} sub={`${stats.bookings?.paid || 0} paid · ${stats.bookings?.pending || 0} pending`} color="#9B8AC4" />
          <StatCard label="Booking Revenue" value={`₹${(stats.bookings?.revenue_inr || 0).toLocaleString("en-IN")}`} color="#EBB99A" />
          <StatCard label="Shop Orders" value={stats.orders?.total || 0} sub={`${stats.orders?.paid || 0} paid · ₹${(stats.orders?.revenue_inr || 0).toLocaleString("en-IN")} revenue`} color="#F4C6D6" />
        </div>
      ) : null}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BOOKINGS TAB
// ════════════════════════════════════════════════════════════════════════════
function BookingsTab({ toast }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]  = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    adminFetch("/admin/bookings")
      .then((r) => setBookings(Array.isArray(r) ? r : []))
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, field, value) => {
    try {
      await adminFetch(`/admin/bookings/${id}`, { method: "PATCH", body: JSON.stringify({ [field]: value }) });
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, [field]: value } : b));
      toast("Updated");
    } catch (e) { toast(e.message, "error"); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this booking?")) return;
    try {
      await adminFetch(`/admin/bookings/${id}`, { method: "DELETE" });
      setBookings((prev) => prev.filter((b) => b.id !== id));
      toast("Deleted");
    } catch (e) { toast(e.message, "error"); }
  };

  const exportCSV = () => window.open(`${API}/admin/bookings/export?token=${token()}`, "_blank");

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-[#6B5B95]" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-xl text-[#3A2E5D]">Bookings ({bookings.length})</h3>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl bg-[#E6DDF1] text-[#6B5B95] hover:bg-[#C8B6E2] transition"><RefreshCw size={14} /></button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#6B5B95] text-white text-xs font-medium hover:bg-[#5a4a84] transition">
            <Download size={13} /> Export
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[#C8B6E2]">
        <table className="w-full text-sm">
          <thead className="bg-[#E6DDF1]">
            <tr>{["Name","Service","Date/Slot","Price","Payment","Status","Actions"].map((h)=>(
              <th key={h} className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-[#6B5B95] font-bold whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {bookings.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-[#9B8AC4]">No bookings yet</td></tr>}
            {bookings.map((b, idx) => (
              <tr key={b.id} className={`border-t border-[#E6DDF1] ${idx%2===0?"bg-white/60":"bg-white/30"}`}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="font-medium text-[#3A2E5D]">{b.customer_name}</div>
                  <div className="text-[11px] text-[#9B8AC4]">{b.customer_email}</div>
                </td>
                <td className="px-4 py-3 text-[#3A2E5D] max-w-[160px]"><div className="truncate">{b.service_name}</div></td>
                <td className="px-4 py-3 whitespace-nowrap text-[#3A2E5D]">
                  <div>{b.booking_date||"—"}</div>
                  <div className="text-[11px] text-[#9B8AC4]">{b.booking_slot||""}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-semibold text-[#3A2E5D]">
                  ₹{(b.final_price_inr||b.service_price_inr||0).toLocaleString("en-IN")}
                  {b.discount_inr>0&&<div className="text-[10px] text-green-600">−₹{b.discount_inr}</div>}
                </td>
                <td className="px-4 py-3"><StatusBadge value={b.payment_status}/></td>
                <td className="px-4 py-3">
                  <select value={b.booking_status} onChange={(e)=>updateStatus(b.id,"booking_status",e.target.value)}
                    className="text-xs border border-[#C8B6E2] rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#6B5B95]">
                    {["pending","confirmed","completed","cancelled"].map((s)=><option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button onClick={()=>del(b.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition"><Trash2 size={13}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ORDERS TAB
// ════════════════════════════════════════════════════════════════════════════
function OrdersTab({ toast }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    adminFetch("/admin/orders")
      .then((r) => setOrders(Array.isArray(r) ? r : []))
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, value) => {
    try {
      await adminFetch(`/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify({ order_status: value }) });
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, order_status: value } : o));
      toast("Updated");
    } catch (e) { toast(e.message, "error"); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this order?")) return;
    try {
      await adminFetch(`/admin/orders/${id}`, { method: "DELETE" });
      setOrders((prev) => prev.filter((o) => o.id !== id));
      toast("Deleted");
    } catch (e) { toast(e.message, "error"); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-[#6B5B95]" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-xl text-[#3A2E5D]">Shop Orders ({orders.length})</h3>
        <button onClick={load} className="p-2 rounded-xl bg-[#E6DDF1] text-[#6B5B95] hover:bg-[#C8B6E2] transition"><RefreshCw size={14}/></button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[#C8B6E2]">
        <table className="w-full text-sm">
          <thead className="bg-[#E6DDF1]">
            <tr>{["Customer","Items","Total","Payment","Status","Actions"].map((h)=>(
              <th key={h} className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-[#6B5B95] font-bold whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {orders.length===0&&<tr><td colSpan={6} className="text-center py-10 text-[#9B8AC4]">No orders yet</td></tr>}
            {orders.map((o,idx)=>(
              <tr key={o.id} className={`border-t border-[#E6DDF1] ${idx%2===0?"bg-white/60":"bg-white/30"}`}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="font-medium text-[#3A2E5D]">{o.customer_name}</div>
                  <div className="text-[11px] text-[#9B8AC4]">{o.customer_email}</div>
                  <div className="text-[11px] text-[#9B8AC4]">{o.address?.city}, {o.address?.state}</div>
                </td>
                <td className="px-4 py-3 text-[#3A2E5D]">
                  {(o.items||[]).map((item)=>(
                    <div key={item.product_id} className="text-[11px]">{item.product_name} ×{item.quantity}</div>
                  ))}
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-semibold text-[#3A2E5D]">
                  ₹{(o.total_inr||0).toLocaleString("en-IN")}
                  {o.discount_inr>0&&<div className="text-[10px] text-green-600">−₹{o.discount_inr}</div>}
                </td>
                <td className="px-4 py-3"><StatusBadge value={o.payment_status}/></td>
                <td className="px-4 py-3">
                  <select value={o.order_status} onChange={(e)=>updateStatus(o.id,e.target.value)}
                    className="text-xs border border-[#C8B6E2] rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#6B5B95]">
                    {["pending","confirmed","shipped","delivered","cancelled"].map((s)=><option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button onClick={()=>del(o.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition"><Trash2 size={13}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CATEGORIES TAB
// ════════════════════════════════════════════════════════════════════════════
const EMPTY_CAT = { id:"", name:"", description:"", accent:"from-[#C8B6E2] to-[#E6DDF1]", icon:"sparkles", order:"100", image_url:"" };

function CategoriesTab({ toast }) {
  const [cats, setCats]         = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editCat, setEditCat]   = useState(null);
  const [form, setForm]         = useState(EMPTY_CAT);
  const [cropSrc, setCropSrc]   = useState(null); // raw base64 before crop
  const [imgPreview, setImgPreview] = useState(null); // final cropped preview
  const [saving, setSaving]     = useState(false);
  const [expandedCat, setExpandedCat] = useState(null);
  const fileRef = useRef();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([adminFetch("/admin/product-categories"), adminFetch("/admin/products")])
      .then(([c, p]) => { setCats(Array.isArray(c)?c:[]); setProducts(Array.isArray(p)?p:[]); })
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast("Image must be under 8 MB", "error"); return; }
    const b64 = await fileToBase64(file);
    setCropSrc(b64); // open crop dialog
    e.target.value = "";
  };

  const onCropped = (b64) => {
    setForm((f) => ({ ...f, image_url: b64 }));
    setImgPreview(b64);
    setCropSrc(null);
  };

  const openAdd = () => { setEditCat(null); setForm(EMPTY_CAT); setImgPreview(null); setFormOpen(true); };
  const openEdit = (cat) => {
    setEditCat(cat);
    setForm({ ...EMPTY_CAT, ...cat, order: String(cat.order||100) });
    setImgPreview(cat.image_url ? resolveImg(cat.image_url) : null);
    setFormOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.id.trim()||!form.name.trim()) { toast("ID and name are required","error"); return; }
    setSaving(true);
    try {
      const payload = { ...form, order: parseInt(form.order,10)||100 };
      if (editCat) {
        await adminFetch(`/admin/product-categories/${editCat.id}`, { method:"PUT", body:JSON.stringify(payload) });
        toast("Category updated");
      } else {
        await adminFetch("/admin/product-categories", { method:"POST", body:JSON.stringify(payload) });
        toast("Category created");
      }
      setFormOpen(false); load();
    } catch (e) { toast(e.message,"error"); }
    finally { setSaving(false); }
  };

  const deleteCat = async (id) => {
    if (!window.confirm("Delete this category? Products will be detached but not deleted.")) return;
    try {
      await adminFetch(`/admin/product-categories/${id}`, { method:"DELETE" });
      toast("Deleted"); load();
    } catch (e) { toast(e.message,"error"); }
  };

  const catProducts = (catId) => products.filter((p) => p.product_category_id === catId);

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-[#6B5B95]"/></div>;

  return (
    <div>
      {cropSrc && <CropDialog src={cropSrc} onCrop={onCropped} onCancel={() => setCropSrc(null)} />}

      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-xl text-[#3A2E5D]">Shop Categories ({cats.length})</h3>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl bg-[#E6DDF1] text-[#6B5B95] hover:bg-[#C8B6E2] transition"><RefreshCw size={14}/></button>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#6B5B95] text-white text-xs font-medium hover:bg-[#5a4a84] transition">
            <Plus size={13}/> Add Category
          </button>
        </div>
      </div>

      {formOpen && (
        <form onSubmit={save} className="mb-6 p-5 rounded-2xl bg-[#F5EEF8] border border-[#C8B6E2] space-y-3">
          <p className="font-semibold text-[#3A2E5D] text-sm">{editCat?"Edit Category":"New Category"}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className={inputCls} placeholder="Category ID (e.g. candles) *" value={form.id} onChange={set("id")} disabled={!!editCat} required/>
            <input className={inputCls} placeholder="Display name *" value={form.name} onChange={set("name")} required/>
            <input className={`${inputCls} sm:col-span-2`} placeholder="Short description (optional)" value={form.description} onChange={set("description")}/>
            <input className={inputCls} type="number" placeholder="Display order (default 100)" value={form.order} onChange={set("order")}/>
            <input className={inputCls} placeholder="Paste an image URL (optional)" value={form.image_url && !form.image_url.startsWith("data:") ? form.image_url : ""}
              onChange={(e) => { setForm((f)=>({...f,image_url:e.target.value})); setImgPreview(null); }}/>
          </div>

          <div className="flex items-start gap-4">
            <div>
              <p className="text-xs text-[#9B8AC4] mb-1.5 font-medium">Upload cover image (opens crop tool)</p>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[#C8B6E2] bg-white text-[#6B5B95] text-xs hover:border-[#6B5B95] transition">
                <ImagePlus size={14}/> Choose &amp; Crop image
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
            </div>
            {imgPreview && (
              <div className="relative">
                <img src={imgPreview} alt="preview" className="w-20 h-20 rounded-xl object-cover border border-[#C8B6E2]"/>
                <button type="button" onClick={() => { setImgPreview(null); setForm((f)=>({...f,image_url:""})); }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                  <X size={10}/>
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#6B5B95] text-white text-sm font-semibold hover:bg-[#5a4a84] transition disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin"/>}
              {editCat?"Save Changes":"Create Category"}
            </button>
            <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2.5 rounded-xl bg-white border border-[#C8B6E2] text-[#3A2E5D] text-sm hover:bg-[#E6DDF1] transition">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {cats.length===0 && <div className="text-center py-12 text-[#9B8AC4]">No categories yet</div>}
        {cats.map((cat) => {
          const cps = catProducts(cat.id);
          const expanded = expandedCat === cat.id;
          const thumb = resolveImg(cat.image_url);
          return (
            <div key={cat.id} className="rounded-2xl border border-[#C8B6E2] bg-white/80 overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-[#C8B6E2] to-[#E6DDF1] flex-shrink-0">
                  {thumb
                    ? <img src={thumb} alt={cat.name} className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center"><Sparkles size={20} className="text-white/60"/></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#3A2E5D]">{cat.name}</span>
                    <span className="text-[10px] text-[#9B8AC4] bg-[#F0EBF9] px-2 py-0.5 rounded-full">{cat.id}</span>
                  </div>
                  {cat.description && <p className="text-xs text-[#9B8AC4] mt-0.5 truncate">{cat.description}</p>}
                  <p className="text-[11px] text-[#6B5B95] font-medium mt-0.5">{cps.length} products</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => setExpandedCat(expanded?null:cat.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#C8B6E2] text-[#6B5B95] text-xs font-medium hover:bg-[#F0EBF9] transition">
                    <Layers size={12}/> Products {expanded?<ChevronUp size={11}/>:<ChevronDown size={11}/>}
                  </button>
                  <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg text-[#6B5B95] hover:bg-[#E6DDF1] transition"><Edit2 size={13}/></button>
                  <button onClick={() => deleteCat(cat.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition"><Trash2 size={13}/></button>
                </div>
              </div>
              {expanded && (
                <div className="border-t border-[#E6DDF1] bg-[#FAFAF7]">
                  {cps.length===0 ? <p className="px-5 py-4 text-sm text-[#9B8AC4]">No products in this category yet.</p> : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-[#F0EBF9]">
                          {["Product","Price","Stock","Tags"].map((h)=>(
                            <th key={h} className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-[#6B5B95] font-bold whitespace-nowrap">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {cps.map((p,i)=>(
                            <tr key={p.id} className={`border-t border-[#E6DDF1] ${i%2===0?"bg-white/50":"bg-white/20"}`}>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  {resolveImg(p.image_url) && (
                                    <img src={resolveImg(p.image_url)} alt={p.name} className="w-8 h-8 rounded-lg object-cover border border-[#C8B6E2] flex-shrink-0"
                                      onError={(e)=>{e.target.style.display="none"}}/>
                                  )}
                                  <div>
                                    <div className="font-medium text-[#3A2E5D] text-[13px]">{p.name}</div>
                                    {p.badge&&<span className="text-[9px] bg-[#EBB99A] text-[#3A2E5D] font-bold px-1.5 py-0.5 rounded-full">{p.badge}</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-[#3A2E5D] font-semibold whitespace-nowrap">₹{(p.price_inr||0).toLocaleString("en-IN")}</td>
                              <td className="px-4 py-2.5">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${p.in_stock?"bg-green-100 text-green-700":"bg-red-100 text-red-600"}`}>
                                  {p.in_stock?"In Stock":"Out of Stock"}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex gap-1 flex-wrap">
                                  {(p.tags||[]).map((t)=>(
                                    <span key={t} className="text-[9px] bg-[#E6DDF1] text-[#6B5B95] px-1.5 py-0.5 rounded-full">{t}</span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PRODUCTS TAB — with variants panel + image upload with crop
// ════════════════════════════════════════════════════════════════════════════
const EMPTY_PRODUCT = { id:"", name:"", blurb:"", price_inr:"", product_category_id:"", badge:"", in_stock:true, tags:"" };

function ProductsTab({ toast }) {
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [adding, setAdding]       = useState(false);
  const [form, setForm]           = useState(EMPTY_PRODUCT);
  const [variantRow, setVariantRow] = useState(null);
  const [cropSrc, setCropSrc]     = useState(null);
  const [uploadingFor, setUploadingFor] = useState(null);
  const imgInputRef = useRef();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([adminFetch("/admin/products"), adminFetch("/admin/product-categories")])
      .then(([p, c]) => { setProducts(Array.isArray(p)?p:[]); setCategories(Array.isArray(c)?c:[]); })
      .catch((e) => toast(e.message,"error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setCheck = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));

  const addProduct = async (e) => {
    e.preventDefault();
    try {
      await adminFetch("/admin/products", {
        method: "POST",
        body: JSON.stringify({ ...form, price_inr:parseInt(form.price_inr,10), tags:form.tags.split(",").map((t)=>t.trim()).filter(Boolean) }),
      });
      toast("Product added"); setAdding(false); setForm(EMPTY_PRODUCT); load();
    } catch (e) { toast(e.message,"error"); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await adminFetch(`/admin/products/${id}`, { method:"DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== id)); toast("Deleted");
    } catch (e) { toast(e.message,"error"); }
  };

  const toggleStock = async (product) => {
    try {
      await adminFetch(`/admin/products/${product.id}`, { method:"PUT", body:JSON.stringify({...product,in_stock:!product.in_stock}) });
      setProducts((prev) => prev.map((p) => p.id===product.id ? {...p,in_stock:!p.in_stock} : p));
      toast("Updated");
    } catch (e) { toast(e.message,"error"); }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingFor) return;
    if (file.size > 8 * 1024 * 1024) { toast("Image must be under 8 MB","error"); e.target.value=""; return; }
    const b64 = await fileToBase64(file);
    setCropSrc(b64); // open crop dialog
    e.target.value = "";
  };

  const onCropped = async (b64) => {
    setCropSrc(null);
    if (!uploadingFor) return;
    try {
      await adminFetch(`/admin/products/${uploadingFor}/images`, { method:"POST", body:JSON.stringify({ image_data: b64 }) });
      toast("Image uploaded"); load();
    } catch (e) { toast(e.message,"error"); }
    setUploadingFor(null);
  };

  const variantsOf = (product) => products.filter((p) => p.product_category_id === product.product_category_id && p.id !== product.id);
  const catName = (id) => categories.find((c) => c.id===id)?.name || id || "—";

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-[#6B5B95]"/></div>;

  return (
    <div>
      {cropSrc && (
        <CropDialog
          src={cropSrc}
          onCrop={onCropped}
          onCancel={() => { setCropSrc(null); setUploadingFor(null); }}
        />
      )}
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect}/>

      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-xl text-[#3A2E5D]">Products ({products.length})</h3>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl bg-[#E6DDF1] text-[#6B5B95] hover:bg-[#C8B6E2] transition"><RefreshCw size={14}/></button>
          <button onClick={() => setAdding((v)=>!v)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#6B5B95] text-white text-xs font-medium hover:bg-[#5a4a84] transition">
            <Plus size={13}/> Add Product
          </button>
        </div>
      </div>

      {adding && (
        <form onSubmit={addProduct} className="mb-6 p-5 rounded-2xl bg-[#F5EEF8] border border-[#C8B6E2] grid sm:grid-cols-2 gap-3">
          <input className={inputCls} placeholder="ID (e.g. candle-new) *" value={form.id} onChange={set("id")} required/>
          <input className={inputCls} placeholder="Product name *" value={form.name} onChange={set("name")} required/>
          <input className={`${inputCls} sm:col-span-2`} placeholder="Short description / blurb" value={form.blurb} onChange={set("blurb")}/>
          <input className={inputCls} type="number" placeholder="Price (₹) *" value={form.price_inr} onChange={set("price_inr")} required/>
          <select className={inputCls} value={form.product_category_id} onChange={set("product_category_id")}>
            <option value="">Select category</option>
            {categories.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className={inputCls} placeholder="Badge (e.g. Bestseller)" value={form.badge} onChange={set("badge")}/>
          <input className={inputCls} placeholder="Tags (comma-separated, e.g. love,money)" value={form.tags} onChange={set("tags")}/>
          <label className="flex items-center gap-2 text-sm text-[#3A2E5D]">
            <input type="checkbox" checked={form.in_stock} onChange={setCheck("in_stock")}/> In Stock
          </label>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-[#6B5B95] text-white text-sm font-semibold hover:bg-[#5a4a84] transition">Add Product</button>
            <button type="button" onClick={()=>setAdding(false)} className="px-4 py-2.5 rounded-xl bg-white border border-[#C8B6E2] text-[#3A2E5D] text-sm hover:bg-[#E6DDF1] transition">Cancel</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[#C8B6E2]">
        <table className="w-full text-sm">
          <thead className="bg-[#E6DDF1]">
            <tr>{["Product","Category","Price","Stock","Tags","Actions"].map((h)=>(
              <th key={h} className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-[#6B5B95] font-bold whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {products.length===0&&<tr><td colSpan={6} className="text-center py-10 text-[#9B8AC4]">No products yet</td></tr>}
            {products.map((p,idx)=>{
              const variants = variantsOf(p);
              const isOpen   = variantRow === p.id;
              const thumb    = resolveImg(p.image_url);
              return (
                <React.Fragment key={p.id}>
                  <tr className={`border-t border-[#E6DDF1] ${idx%2===0?"bg-white/60":"bg-white/30"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {thumb ? (
                          <img src={thumb} alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover border border-[#C8B6E2] flex-shrink-0"
                            onError={(e)=>{e.target.style.display="none"}}/>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#C8B6E2] to-[#E6DDF1] flex items-center justify-center flex-shrink-0">
                            <Sparkles size={14} className="text-white/60"/>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-[#3A2E5D]">{p.name}</div>
                          {p.badge&&<span className="text-[10px] bg-[#EBB99A] text-[#3A2E5D] font-bold px-2 py-0.5 rounded-full">{p.badge}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#3A2E5D]">{catName(p.product_category_id)}</td>
                    <td className="px-4 py-3 font-semibold text-[#3A2E5D] whitespace-nowrap">₹{(p.price_inr||0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <button onClick={()=>toggleStock(p)}
                        className={`text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full transition ${p.in_stock?"bg-green-100 text-green-700 hover:bg-green-200":"bg-red-100 text-red-600 hover:bg-red-200"}`}>
                        {p.in_stock?"In Stock":"Out of Stock"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {(p.tags||[]).map((t)=>(
                          <span key={t} className="text-[10px] bg-[#E6DDF1] text-[#6B5B95] px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button title="Upload &amp; crop image"
                          onClick={() => { setUploadingFor(p.id); imgInputRef.current?.click(); }}
                          className="p-1.5 rounded-lg text-[#9B8AC4] hover:bg-[#E6DDF1] transition">
                          <ImagePlus size={13}/>
                        </button>
                        {variants.length>0&&(
                          <button title={`View ${variants.length} related products`}
                            onClick={() => setVariantRow(isOpen?null:p.id)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition ${isOpen?"bg-[#6B5B95] text-white":"bg-[#F0EBF9] text-[#6B5B95] hover:bg-[#E6DDF1]"}`}>
                            <Layers size={11}/> {variants.length}
                          </button>
                        )}
                        <button onClick={()=>del(p.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                  {isOpen&&(
                    <tr className="bg-[#F5EEF8]">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Layers size={13} className="text-[#6B5B95]"/>
                          <span className="text-xs font-bold text-[#6B5B95] uppercase tracking-wide">
                            Other products in "{catName(p.product_category_id)}"
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {variants.map((v)=>{
                            const vThumb = resolveImg(v.image_url);
                            return (
                              <div key={v.id} className="flex items-center gap-2 bg-white rounded-xl border border-[#C8B6E2] px-3 py-2">
                                {vThumb
                                  ? <img src={vThumb} alt={v.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-[#C8B6E2]" onError={(e)=>{e.target.style.display="none"}}/>
                                  : <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C8B6E2] to-[#E6DDF1] flex items-center justify-center flex-shrink-0"><Sparkles size={12} className="text-white/60"/></div>
                                }
                                <div className="min-w-0">
                                  <p className="text-[12px] font-semibold text-[#3A2E5D] truncate">{v.name}</p>
                                  <p className="text-[11px] text-[#9B8AC4]">₹{(v.price_inr||0).toLocaleString("en-IN")}</p>
                                  <span className={`text-[9px] font-bold ${v.in_stock?"text-green-600":"text-red-500"}`}>{v.in_stock?"In Stock":"Out"}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PROMOTIONS TAB
// ════════════════════════════════════════════════════════════════════════════
const EMPTY_PROMO = { id:"", code:"", title:"", discount_type:"percent", discount_value:"", scope:"site_wide", active:true, show_banner:true, banner_text:"", min_order_inr:0, ends_at:"" };

function PromotionsTab({ toast }) {
  const [promos, setPromos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding]   = useState(false);
  const [form, setForm]       = useState(EMPTY_PROMO);

  const load = useCallback(() => {
    setLoading(true);
    adminFetch("/admin/promotions")
      .then((r) => setPromos(Array.isArray(r)?r:[]))
      .catch((e) => toast(e.message,"error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setCheck = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));

  const addPromo = async (e) => {
    e.preventDefault();
    try {
      await adminFetch("/admin/promotions", { method:"POST", body:JSON.stringify({...form, discount_value:parseFloat(form.discount_value), min_order_inr:parseInt(form.min_order_inr,10)||0}) });
      toast("Promotion created"); setAdding(false); load();
    } catch (e) { toast(e.message,"error"); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this promotion?")) return;
    try {
      await adminFetch(`/admin/promotions/${id}`, { method:"DELETE" });
      setPromos((prev) => prev.filter((p) => p.id!==id)); toast("Deleted");
    } catch (e) { toast(e.message,"error"); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-[#6B5B95]"/></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-xl text-[#3A2E5D]">Promotions ({promos.length})</h3>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl bg-[#E6DDF1] text-[#6B5B95] hover:bg-[#C8B6E2] transition"><RefreshCw size={14}/></button>
          <button onClick={() => setAdding((v)=>!v)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#6B5B95] text-white text-xs font-medium hover:bg-[#5a4a84] transition">
            <Plus size={13}/> New Promo
          </button>
        </div>
      </div>
      {adding && (
        <form onSubmit={addPromo} className="mb-6 p-5 rounded-2xl bg-[#F5EEF8] border border-[#C8B6E2] grid sm:grid-cols-2 gap-3">
          <input className={inputCls} placeholder="ID (unique)" value={form.id} onChange={set("id")} required/>
          <input className={inputCls} placeholder="Coupon code (e.g. LOVE20)" value={form.code} onChange={set("code")}/>
          <input className={`${inputCls} sm:col-span-2`} placeholder="Title / description" value={form.title} onChange={set("title")} required/>
          <select className={inputCls} value={form.discount_type} onChange={set("discount_type")}>
            <option value="percent">Percent off</option>
            <option value="flat">Flat amount off</option>
          </select>
          <input className={inputCls} type="number" placeholder="Discount value" value={form.discount_value} onChange={set("discount_value")} required/>
          <select className={inputCls} value={form.scope} onChange={set("scope")}>
            <option value="site_wide">Site-wide</option>
            <option value="services_only">Services only</option>
            <option value="products_only">Products only</option>
          </select>
          <input className={inputCls} type="number" placeholder="Min order (₹)" value={form.min_order_inr} onChange={set("min_order_inr")}/>
          <input className={inputCls} placeholder="Banner text (optional)" value={form.banner_text} onChange={set("banner_text")}/>
          <input className={inputCls} placeholder="Ends at (YYYY-MM-DDTHH:MM:SSZ)" value={form.ends_at} onChange={set("ends_at")}/>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-sm text-[#3A2E5D]"><input type="checkbox" checked={form.active} onChange={setCheck("active")}/> Active</label>
            <label className="flex items-center gap-1.5 text-sm text-[#3A2E5D]"><input type="checkbox" checked={form.show_banner} onChange={setCheck("show_banner")}/> Show banner</label>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-[#6B5B95] text-white text-sm font-semibold hover:bg-[#5a4a84] transition">Create Promotion</button>
            <button type="button" onClick={() => setAdding(false)} className="px-4 py-2.5 rounded-xl bg-white border border-[#C8B6E2] text-[#3A2E5D] text-sm hover:bg-[#E6DDF1] transition">Cancel</button>
          </div>
        </form>
      )}
      <div className="space-y-3">
        {promos.length===0&&<div className="text-center py-10 text-[#9B8AC4]">No promotions yet</div>}
        {promos.map((p)=>(
          <div key={p.id} className="flex items-center justify-between bg-white/70 border border-[#C8B6E2] rounded-2xl px-5 py-4">
            <div>
              {p.code&&<span className="bg-[#EBB99A] text-[#3A2E5D] text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mr-2">{p.code}</span>}
              <span className="font-medium text-[#3A2E5D] text-sm">{p.title}</span>
              <div className="text-[11px] text-[#9B8AC4] mt-1">
                {p.discount_type==="percent"?`${p.discount_value}% off`:`₹${p.discount_value} off`}
                {" · "}{p.scope}{" · "}{p.active?"Active":"Inactive"}
              </div>
            </div>
            <button onClick={()=>del(p.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition ml-4"><Trash2 size={13}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id:"stats",      label:"Overview",   icon:BarChart2  },
  { id:"bookings",   label:"Bookings",   icon:BookOpen   },
  { id:"orders",     label:"Orders",     icon:ShoppingBag},
  { id:"categories", label:"Categories", icon:FolderOpen },
  { id:"products",   label:"Products",   icon:Package    },
  { id:"promotions", label:"Promos",     icon:Tag        },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("stats");
  const { show: showToast, el: toastEl } = useToast();

  useEffect(() => {
    const tok = localStorage.getItem("admin_token");
    if (!tok) { navigate("/admin/login"); return; }
    fetch(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${tok}` } })
      .then((r) => { if (!r.ok) throw new Error(); })
      .catch(() => { localStorage.removeItem("admin_token"); navigate("/admin/login"); });
  }, [navigate]);

  const logout = () => { localStorage.removeItem("admin_token"); navigate("/admin/login"); };

  return (
    <div className="min-h-screen bg-[#F5EEF8]">
      {toastEl}
      <div className="flex">
        <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-[#3A2E5D] text-white fixed left-0 top-0 z-30">
          <div className="px-6 py-8 border-b border-white/10">
            <div className="text-[10px] uppercase tracking-[0.3em] text-yellow-200/70">Admin Panel</div>
            <div className="font-display text-xl italic mt-1">guidance angel</div>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1">
            {TABS.map((tab)=>(
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${activeTab===tab.id?"bg-[#6B5B95] text-white shadow-md":"text-white/70 hover:bg-white/10"}`}>
                <tab.icon size={15}/> {tab.label}
              </button>
            ))}
          </nav>
          <div className="px-4 py-5 border-t border-white/10">
            <a href="/" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 transition">
              <Sparkles size={14}/> View Site
            </a>
            <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-white/70 hover:bg-red-500/20 hover:text-red-300 transition">
              <LogOut size={14}/> Sign Out
            </button>
          </div>
        </aside>

        <div className="lg:hidden fixed top-0 inset-x-0 z-30 bg-[#3A2E5D] text-white px-4 py-3 flex items-center justify-between">
          <span className="font-display text-lg italic">guidance angel <span className="text-[10px] tracking-widest text-yellow-200/70 not-italic">admin</span></span>
          <button onClick={logout} className="p-2 rounded-xl bg-white/10 hover:bg-white/20"><LogOut size={15}/></button>
        </div>

        <main className="flex-1 lg:ml-64 p-6 lg:p-10 pt-16 lg:pt-10">
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-6">
            {TABS.map((tab)=>(
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition ${activeTab===tab.id?"bg-[#6B5B95] text-white":"bg-white border border-[#C8B6E2] text-[#3A2E5D]"}`}>
                <tab.icon size={12}/> {tab.label}
              </button>
            ))}
          </div>

          {activeTab==="stats"      && <StatsTab      toast={showToast}/>}
          {activeTab==="bookings"   && <BookingsTab   toast={showToast}/>}
          {activeTab==="orders"     && <OrdersTab     toast={showToast}/>}
          {activeTab==="categories" && <CategoriesTab toast={showToast}/>}
          {activeTab==="products"   && <ProductsTab   toast={showToast}/>}
          {activeTab==="promotions" && <PromotionsTab toast={showToast}/>}
        </main>
      </div>
    </div>
  );
}
