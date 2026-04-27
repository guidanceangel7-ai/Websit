/**
 * Shop.jsx  — Complete end-to-end shop for Guidance Angel
 *
 * Two user flows:
 *  1. Tag click at top  → product grid filtered by tag (across all categories)
 *  2. Category card     → category detail view → product grid → Add to Cart
 *                         → Cart sidebar → Checkout dialog → Razorpay payment
 */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Plus, Minus, X, Sparkles, Package,
  Check, Loader2, ChevronRight, ArrowLeft, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { Overline, StarDivider } from "./Decor";
import AvailableOffers from "./AvailableOffers";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const RAZORPAY_KEY = process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_test_PLACEHOLDER";

// ── Brand colours (inline so nothing is missing even if tailwind purges) ────
const C = {
  plum:    "#3A2E5D",
  purple:  "#6B5B95",
  lilac:   "#C8B6E2",
  lavDark: "#5a4a84",
  peach:   "#EBB99A",
  ivory:   "#FBF4E8",
  soft:    "#F5EEF8",
};

// ── Gradient palette for cards without images ────────────────────────────────
const GRADS = [
  "from-[#C8B6E2] to-[#9B8AC4]",
  "from-[#EBB99A] to-[#D9956A]",
  "from-[#F4C6D6] to-[#EBB99A]",
  "from-[#9B8AC4] to-[#6B5B95]",
  "from-[#C8B6E2] to-[#F4C6D6]",
  "from-[#EBB99A] to-[#C8B6E2]",
  "from-[#9B8AC4] to-[#F4C6D6]",
];
function grad(id = "") {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0x7fffffff;
  return GRADS[h % GRADS.length];
}

// ── Resolve image URL (handles http, /api path, base64) ─────────────────────
function imgSrc(product) {
  const url = product?.image_url;
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/api/products/"))
    return `${process.env.REACT_APP_BACKEND_URL}${url}`;
  if (url.startsWith("data:")) return url;
  return null;
}

// ── Load Razorpay script ─────────────────────────────────────────────────────
function loadRazorpay() {
  return new Promise((ok) => {
    if (window.Razorpay) return ok(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => ok(true);
    s.onerror = () => ok(false);
    document.body.appendChild(s);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// SKELETON – shown while data loads
// ════════════════════════════════════════════════════════════════════════════
function Skeleton({ aspect = "square", rows = 6 }) {
  return (
    <div className={`rounded-2xl border border-[${C.lilac}]/50 overflow-hidden animate-pulse bg-white`}>
      <div className={`${aspect === "square" ? "aspect-square" : "h-40"} bg-gradient-to-br from-[${C.lilac}]/30 to-[${C.soft}]`} />
      <div className="p-4 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`h-3 bg-[${C.lilac}]/40 rounded-full`} style={{ width: i === 0 ? "40%" : i === 1 ? "70%" : "55%" }} />
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CATEGORY CARD – shown on the home / browse view
// ════════════════════════════════════════════════════════════════════════════
function CategoryCard({ cat, onClick }) {
  const count = (cat.products || []).length;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      onClick={onClick}
      className="group cursor-pointer rounded-3xl overflow-hidden border border-[#C8B6E2]/60 bg-white shadow-sm hover:shadow-[0_8px_32px_rgba(107,91,149,0.18)] transition-all duration-300"
    >
      {/* Hero gradient / image */}
      <div className={`h-44 sm:h-52 bg-gradient-to-br ${grad(cat.id)} relative overflow-hidden`}>
        {cat.image_url ? (
          <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Sparkles size={36} className="text-white/60" />
          </div>
        )}
        {/* product count badge */}
        <div className="absolute top-3 right-3 bg-white/90 text-[#3A2E5D] text-[10px] font-bold px-2.5 py-1 rounded-full">
          {count} {count === 1 ? "product" : "products"}
        </div>
      </div>
      {/* Info */}
      <div className="p-5">
        <h3 className="font-display text-lg text-[#3A2E5D] font-semibold leading-tight">{cat.name}</h3>
        {cat.description && (
          <p className="mt-1.5 text-sm text-[#3A2E5D]/60 leading-relaxed line-clamp-2">{cat.description}</p>
        )}
        <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B5B95] group-hover:gap-3 transition-all duration-200">
          Shop now <ChevronRight size={15} />
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PRODUCT CARD – shown inside a category or in tag-filter results
// ════════════════════════════════════════════════════════════════════════════
function ProductCard({ product, onAdd, cartQty }) {
  const src = imgSrc(product);
  const [imgErr, setImgErr] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35 }}
      className="group relative bg-white rounded-3xl border border-[#C8B6E2]/60 overflow-hidden shadow-sm hover:shadow-[0_8px_28px_rgba(107,91,149,0.16)] transition-shadow duration-300 flex flex-col"
    >
      {/* Badge */}
      {product.badge && (
        <span className="absolute top-3 left-3 z-10 bg-[#EBB99A] text-[#3A2E5D] text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full shadow-sm">
          {product.badge}
        </span>
      )}

      {/* Out-of-stock overlay */}
      {!product.in_stock && (
        <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[2px] flex items-center justify-center rounded-3xl">
          <span className="bg-[#3A2E5D] text-[#FBF4E8] text-[10px] font-bold tracking-widest uppercase px-4 py-2 rounded-full">
            Out of Stock
          </span>
        </div>
      )}

      {/* Image */}
      <div className={`aspect-square overflow-hidden bg-gradient-to-br ${grad(product.id)} flex-shrink-0`}>
        {src && !imgErr ? (
          <img
            src={src}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center">
            <Sparkles size={32} className="text-white/60" />
            <span className="text-white/70 text-[11px] font-medium leading-tight">{product.name}</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col flex-1">
        {/* Tags */}
        {product.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {product.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[9px] tracking-wider uppercase text-[#9B8AC4] bg-[#F0EBF9] rounded-full px-2 py-0.5 font-medium">
                {t}
              </span>
            ))}
          </div>
        )}
        <h3 className="font-display text-[15px] text-[#3A2E5D] font-semibold leading-snug flex-1">{product.name}</h3>
        {product.blurb && (
          <p className="mt-1.5 text-xs text-[#3A2E5D]/60 leading-relaxed line-clamp-2">{product.blurb}</p>
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="font-bold text-[#3A2E5D] text-base">
            ₹{(product.price_inr || 0).toLocaleString("en-IN")}
          </span>
          {product.in_stock && (
            <button
              onClick={() => onAdd(product)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all duration-200 ${
                cartQty > 0
                  ? "bg-[#EBB99A] text-[#3A2E5D]"
                  : "bg-[#6B5B95] text-[#FBF4E8] hover:bg-[#5a4a84] shadow-[0_4px_14px_rgba(107,91,149,0.35)]"
              }`}
            >
              {cartQty > 0 ? <><Check size={11} /> Added ({cartQty})</> : <><Plus size={11} /> Add to Cart</>}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CART SIDEBAR
// ════════════════════════════════════════════════════════════════════════════
function CartSidebar({ cart, onAdd, onRemove, onClear, onCheckout, onClose }) {
  const total = cart.reduce((s, i) => s + (i.price_inr || 0) * i.qty, 0);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative bg-[#FBF4E8] w-full max-w-[360px] h-full flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-[#6B5B95] text-[#FBF4E8] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingCart size={18} />
            <span className="font-display text-lg">Your Bag</span>
            {cart.length > 0 && (
              <span className="bg-[#EBB99A] text-[#3A2E5D] text-[10px] font-bold px-2 py-0.5 rounded-full">
                {cart.reduce((s, i) => s + i.qty, 0)}
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition">
            <X size={14} />
          </button>
        </div>

        {/* Empty state */}
        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <ShoppingCart size={44} className="text-[#C8B6E2] mb-4" />
            <p className="font-display text-lg text-[#3A2E5D]">Your bag is empty</p>
            <p className="text-sm text-[#9B8AC4] mt-1">Add something magical ✦</p>
            <button onClick={onClose} className="mt-5 px-5 py-2 rounded-full bg-[#6B5B95] text-[#FBF4E8] text-sm font-semibold hover:bg-[#5a4a84] transition">
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-start gap-3 bg-white/70 rounded-2xl p-3 border border-[#C8B6E2]/50">
                  {/* Thumbnail */}
                  <div className={`w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden bg-gradient-to-br ${grad(item.id)} flex items-center justify-center`}>
                    {imgSrc(item) ? (
                      <img src={imgSrc(item)} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Sparkles size={18} className="text-white/60" />
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#3A2E5D] leading-tight truncate">{item.name}</p>
                    <p className="text-[11px] text-[#9B8AC4] mt-0.5">₹{(item.price_inr || 0).toLocaleString("en-IN")} each</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => onRemove(item.id)} className="w-6 h-6 rounded-full bg-[#E6DDF1] text-[#6B5B95] flex items-center justify-center hover:bg-[#C8B6E2] transition">
                        <Minus size={10} />
                      </button>
                      <span className="w-5 text-center text-sm font-bold text-[#3A2E5D]">{item.qty}</span>
                      <button onClick={() => onAdd(item)} className="w-6 h-6 rounded-full bg-[#E6DDF1] text-[#6B5B95] flex items-center justify-center hover:bg-[#C8B6E2] transition">
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                  {/* Line total */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-[#3A2E5D]">₹{((item.price_inr || 0) * item.qty).toLocaleString("en-IN")}</p>
                    <button
                      onClick={() => { for (let i = 0; i < item.qty; i++) onRemove(item.id); }}
                      className="text-[10px] text-[#C8B6E2] hover:text-red-400 mt-1 transition"
                    >
                      remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-[#C8B6E2] p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#3A2E5D]/70">Subtotal ({cart.reduce((s, i) => s + i.qty, 0)} items)</span>
                <span className="font-bold text-[#3A2E5D]">₹{total.toLocaleString("en-IN")}</span>
              </div>
              <button
                onClick={onCheckout}
                className="w-full py-3.5 rounded-2xl bg-[#6B5B95] text-[#FBF4E8] font-bold text-sm hover:bg-[#5a4a84] transition flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(107,91,149,0.35)]"
              >
                <Package size={15} /> Proceed to Checkout <ChevronRight size={13} />
              </button>
              <p className="text-center text-[10px] text-[#9B8AC4]">
                Secure payment · Ships pan-India · 5–7 business days
              </p>
            </div>
          </>
        )}
      </motion.aside>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CHECKOUT DIALOG – address form + Razorpay
// ════════════════════════════════════════════════════════════════════════════
function CheckoutDialog({ cart, onClose, onSuccess }) {
  const [coupon, setCoupon] = useState("");
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    addr1: "", addr2: "", city: "", state: "", pin: "", notes: "",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const subtotal = cart.reduce((s, i) => s + (i.price_inr || 0) * i.qty, 0);
  const discount  = couponInfo?.discount_inr || 0;
  const total     = Math.max(0, subtotal - discount);

  const applyCoupon = async () => {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    setCouponBusy(true);
    try {
      const res = await axios.post(`${API}/promotions/validate`, { code, base_inr: subtotal, kind: "products" });
      setCouponInfo(res.data);
      toast.success(`${code} applied — ₹${res.data.discount_inr} off ✦`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid or expired code");
      setCouponInfo(null);
    } finally { setCouponBusy(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    const required = ["name", "email", "phone", "addr1", "city", "state", "pin"];
    for (const k of required) {
      if (!form[k].trim()) { toast.error("Please fill all required fields"); return; }
    }
    setBusy(true);
    try {
      const payload = {
        items: cart.map((i) => ({ product_id: i.id, quantity: i.qty })),
        customer_name: form.name, customer_email: form.email, customer_phone: form.phone,
        address: { line1: form.addr1, line2: form.addr2, city: form.city, state: form.state, postal_code: form.pin, country: "India" },
        notes: form.notes,
        coupon_code: coupon.trim().toUpperCase() || null,
      };
      const { data } = await axios.post(`${API}/orders/create-order`, payload);
      const { order_id, razorpay_order_id, amount_paise, is_mock } = data;

      // Mock mode (dev/test without real Razorpay credentials)
      if (is_mock) {
        await axios.post(`${API}/orders/verify-payment`, {
          order_id, razorpay_order_id, razorpay_payment_id: `pay_mock_${Date.now()}`,
        });
        toast.success("Order placed! 🛍️");
        onSuccess();
        return;
      }

      // Real Razorpay
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error("Payment gateway failed to load. Please try again."); setBusy(false); return; }

      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY, amount: amount_paise, currency: "INR",
        name: "Guidance Angel", description: `Order #${order_id.slice(0, 8)}`,
        order_id: razorpay_order_id,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        theme: { color: "#6B5B95" },
        handler: async (resp) => {
          try {
            await axios.post(`${API}/orders/verify-payment`, {
              order_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            toast.success("Payment successful! Order placed 🛍️");
            onSuccess();
          } catch { toast.error("Payment verification failed. Please contact support."); }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  const inp = "w-full rounded-xl border border-[#C8B6E2] bg-white/90 px-3.5 py-2.5 text-sm text-[#3A2E5D] placeholder:text-[#9B8AC4]/60 focus:outline-none focus:ring-2 focus:ring-[#6B5B95] transition";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: "spring", damping: 28 }}
        className="relative bg-[#FBF4E8] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[94vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#6B5B95] text-[#FBF4E8] px-6 py-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-3xl">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#EBB99A]/80">Guidance Angel</p>
            <p className="font-display text-xl mt-0.5">Complete Your Order</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-5">

          {/* Order summary */}
          <div className="rounded-2xl bg-white/70 border border-[#C8B6E2] p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#9B8AC4] font-bold mb-3">Order Summary</p>
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-[#3A2E5D]">{item.name} <span className="text-[#9B8AC4]">×{item.qty}</span></span>
                <span className="font-semibold text-[#3A2E5D]">₹{((item.price_inr || 0) * item.qty).toLocaleString("en-IN")}</span>
              </div>
            ))}
            <div className="border-t border-[#C8B6E2] pt-2 mt-2 space-y-1">
              <div className="flex justify-between text-sm text-[#3A2E5D]/70">
                <span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount ({coupon})</span><span>−₹{discount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[#3A2E5D] text-base pt-1">
                <span>Total to Pay</span><span>₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Coupon */}
          <div className="space-y-2">
            <AvailableOffers kind="products" appliedCode={coupon.trim().toUpperCase()} onApply={(c) => setCoupon(c)} />
            <div className="flex gap-2">
              <input
                className={`${inp} flex-1`} placeholder="Coupon / promo code"
                value={coupon}
                onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponInfo(null); }}
              />
              <button type="button" onClick={applyCoupon} disabled={couponBusy || !coupon.trim()}
                className="px-4 rounded-xl bg-[#6B5B95] text-[#FBF4E8] text-sm font-semibold hover:bg-[#5a4a84] transition disabled:opacity-50">
                {couponBusy ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
              </button>
            </div>
          </div>

          {/* Customer details */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#9B8AC4] font-bold">Your Details</p>
            <input className={inp} placeholder="Full name *" value={form.name} onChange={set("name")} />
            <input className={inp} type="email" placeholder="Email address *" value={form.email} onChange={set("email")} />
            <input className={inp} type="tel" placeholder="WhatsApp / phone number *" value={form.phone} onChange={set("phone")} />
          </div>

          {/* Shipping address */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#9B8AC4] font-bold">Shipping Address</p>
            <input className={inp} placeholder="Flat / house, street, area *" value={form.addr1} onChange={set("addr1")} />
            <input className={inp} placeholder="Landmark / locality (optional)" value={form.addr2} onChange={set("addr2")} />
            <div className="grid grid-cols-2 gap-2">
              <input className={inp} placeholder="City *" value={form.city} onChange={set("city")} />
              <input className={inp} placeholder="State *" value={form.state} onChange={set("state")} />
            </div>
            <input className={inp} placeholder="PIN code *" value={form.pin} onChange={set("pin")} />
            <textarea className={`${inp} min-h-[56px] resize-none`} placeholder="Special instructions (optional)" value={form.notes} onChange={set("notes")} />
          </div>

          {/* Submit */}
          <button type="submit" disabled={busy}
            className="w-full py-4 rounded-2xl bg-[#6B5B95] text-[#FBF4E8] font-bold text-base hover:bg-[#5a4a84] transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_8px_32px_rgba(107,91,149,0.4)]">
            {busy ? (
              <><Loader2 size={18} className="animate-spin" /> Processing…</>
            ) : (
              <><Package size={18} /> Pay ₹{total.toLocaleString("en-IN")} — Place Order</>
            )}
          </button>

          <p className="text-center text-[11px] text-[#9B8AC4] pb-2">
            🔒 Secure payment via Razorpay &nbsp;·&nbsp; Ships pan-India &nbsp;·&nbsp; 5–7 business days
          </p>
        </form>
      </motion.div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FLOATING CART BUTTON
// ════════════════════════════════════════════════════════════════════════════
function FloatingCart({ count, onClick }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          onClick={onClick}
          className="fixed bottom-6 right-6 z-40 bg-[#6B5B95] text-[#FBF4E8] rounded-full w-14 h-14 flex items-center justify-center shadow-[0_8px_28px_rgba(107,91,149,0.55)] hover:bg-[#5a4a84] transition"
          aria-label={`Open cart (${count} items)`}
        >
          <ShoppingCart size={22} />
          <span className="absolute -top-1.5 -right-1.5 bg-[#EBB99A] text-[#3A2E5D] text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN SHOP COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function Shop() {
  // ── Data state ─────────────────────────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [allTags, setAllTags]       = useState([]);
  const [loading, setLoading]       = useState(true);

  // ── View state ─────────────────────────────────────────────────────────
  // "home"     → category grid + tags
  // "category" → products in selectedCategory
  // "tag"      → products filtered by activeTag
  const [view, setView]                       = useState("home");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeTag, setActiveTag]             = useState(null);

  // ── Cart state ─────────────────────────────────────────────────────────
  const [cart, setCart]               = useState([]);
  const [cartOpen, setCartOpen]       = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderDone, setOrderDone]     = useState(false);

  // ── Fetch data on mount ────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      axios.get(`${API}/product-categories`),
      axios.get(`${API}/tags`).catch(() => ({ data: [] })),
    ])
      .then(([catRes, tagRes]) => {
        if (!alive) return;
        setCategories(Array.isArray(catRes.data) ? catRes.data : []);
        setAllTags(Array.isArray(tagRes.data) ? tagRes.data : []);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // ── Derived: flat list of ALL products ────────────────────────────────
  const allProducts = useMemo(
    () => categories.flatMap((c) => (c.products || []).map((p) => ({ ...p, _catName: c.name }))),
    [categories]
  );

  // ── Derived: tag-filtered products ────────────────────────────────────
  const tagProducts = useMemo(() => {
    if (!activeTag) return [];
    return allProducts.filter((p) => (p.tags || []).includes(activeTag));
  }, [allProducts, activeTag]);

  // ── Cart helpers ──────────────────────────────────────────────────────
  const addToCart = useCallback((product) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { ...product, qty: 1 }];
    });
    toast.success(`${product.name} added to bag ✦`);
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.id === productId);
      if (idx < 0) return prev;
      if (prev[idx].qty <= 1) return prev.filter((i) => i.id !== productId);
      const next = [...prev];
      next[idx] = { ...next[idx], qty: prev[idx].qty - 1 };
      return next;
    });
  }, []);

  const cartQtyFor = (id) => cart.find((i) => i.id === id)?.qty || 0;
  const cartCount  = cart.reduce((s, i) => s + i.qty, 0);

  const handleOrderSuccess = () => {
    setCart([]); setCheckoutOpen(false); setCartOpen(false);
    setOrderDone(true); setTimeout(() => setOrderDone(false), 6000);
  };

  // ── Navigation helpers ────────────────────────────────────────────────
  const openCategory = (cat) => { setSelectedCategory(cat); setView("category"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openTag      = (tag) => { setActiveTag(tag); setView("tag"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const goHome       = ()    => { setView("home"); setSelectedCategory(null); setActiveTag(null); };

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════
  return (
    <section id="shop" className="relative py-20 sm:py-28 bg-gradient-to-b from-[#FBF4E8] via-[#F5EEF8] to-[#FBF4E8] min-h-screen">

      {/* ── Floating cart ─────────────────────────────────────────────── */}
      <FloatingCart count={cartCount} onClick={() => setCartOpen(true)} />

      {/* ── Order success banner ──────────────────────────────────────── */}
      <AnimatePresence>
        {orderDone && (
          <motion.div
            initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#6B5B95] text-[#FBF4E8] px-6 py-3 rounded-full shadow-xl text-sm font-semibold flex items-center gap-2 whitespace-nowrap"
          >
            <Check size={15} /> Order confirmed! We'll ship in 5–7 days 🌟
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-5 sm:px-10">

        {/* ══════════════════════════════════════════════════════════════
            HOME VIEW — tag chips + category grid
        ══════════════════════════════════════════════════════════════ */}
        {view === "home" && (
          <>
            {/* Section header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
              <div>
                <Overline>Sacred Shop</Overline>
                <h2 className="font-display mt-4 text-4xl sm:text-5xl text-[#3A2E5D] leading-[1.1] tracking-tight">
                  Candles, <span className="italic text-[#6B5B95]">crystals</span> &amp; oils
                </h2>
                <p className="mt-3 text-[#3A2E5D]/65 max-w-lg text-base leading-relaxed">
                  Every item hand-picked, reiki-charged and infused with intention before it leaves our hands.
                </p>
              </div>
              {cartCount > 0 && (
                <button onClick={() => setCartOpen(true)}
                  className="hidden sm:flex items-center gap-2 bg-[#6B5B95] text-[#FBF4E8] rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-[#5a4a84] transition shadow-md flex-shrink-0">
                  <ShoppingCart size={15} /> Bag ({cartCount})
                </button>
              )}
            </div>

            <StarDivider className="mb-8" />

            {/* Tag filter chips */}
            {!loading && allTags.length > 0 && (
              <div className="mb-10">
                <p className="text-[11px] uppercase tracking-[0.25em] text-[#9B8AC4] font-semibold mb-3 flex items-center gap-2">
                  <Tag size={12} /> Shop by intention
                </p>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((t) => {
                    const slug  = t.slug || t;
                    const label = t.label || t.slug || t;
                    return (
                      <button
                        key={slug}
                        onClick={() => openTag(slug)}
                        className="px-4 py-2 rounded-full border border-[#C8B6E2] bg-white/70 text-[#6B5B95] text-sm font-semibold hover:bg-[#6B5B95] hover:text-[#FBF4E8] hover:border-[#6B5B95] transition-all duration-200"
                      >
                        #{label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} aspect="rect" rows={3} />)}
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-24 text-[#9B8AC4]">
                <Sparkles size={44} className="mx-auto mb-4 opacity-40" />
                <p className="font-display text-xl text-[#3A2E5D]">No categories yet</p>
                <p className="text-sm mt-2">Products will appear here once they're added via admin.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {categories.map((cat) => (
                  <CategoryCard key={cat.id} cat={cat} onClick={() => openCategory(cat)} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            CATEGORY VIEW — products in one category
        ══════════════════════════════════════════════════════════════ */}
        {view === "category" && selectedCategory && (
          <>
            {/* Top bar */}
            <div className="flex items-center justify-between mb-8">
              <button onClick={goHome} className="flex items-center gap-2 text-[#6B5B95] font-semibold text-sm hover:gap-3 transition-all duration-200">
                <ArrowLeft size={16} /> Back to Shop
              </button>
              {cartCount > 0 && (
                <button onClick={() => setCartOpen(true)}
                  className="flex items-center gap-2 bg-[#6B5B95] text-[#FBF4E8] rounded-full px-4 py-2 text-sm font-semibold hover:bg-[#5a4a84] transition shadow-md">
                  <ShoppingCart size={14} /> Bag ({cartCount})
                </button>
              )}
            </div>

            {/* Category header */}
            <div className={`rounded-3xl overflow-hidden mb-10 bg-gradient-to-br ${grad(selectedCategory.id)}`}>
              <div className="p-8 sm:p-12 text-white">
                <Overline className="text-white/70">{selectedCategory.name}</Overline>
                <h2 className="font-display text-3xl sm:text-4xl mt-3 leading-tight">{selectedCategory.name}</h2>
                {selectedCategory.description && (
                  <p className="mt-3 text-white/75 max-w-xl text-base leading-relaxed">{selectedCategory.description}</p>
                )}
                <p className="mt-4 text-white/60 text-sm">
                  {(selectedCategory.products || []).length} {(selectedCategory.products || []).length === 1 ? "product" : "products"} available
                </p>
              </div>
            </div>

            {/* Products */}
            {(selectedCategory.products || []).length === 0 ? (
              <div className="text-center py-20 text-[#9B8AC4]">
                <Sparkles size={40} className="mx-auto mb-4 opacity-40" />
                <p className="font-display text-xl text-[#3A2E5D]">No products in this category yet</p>
                <button onClick={goHome} className="mt-5 px-5 py-2 rounded-full bg-[#6B5B95] text-[#FBF4E8] text-sm font-semibold hover:bg-[#5a4a84] transition">
                  ← Browse other categories
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                {(selectedCategory.products || []).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={addToCart}
                    cartQty={cartQtyFor(product.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAG VIEW — products filtered by tag across all categories
        ══════════════════════════════════════════════════════════════ */}
        {view === "tag" && (
          <>
            {/* Top bar */}
            <div className="flex items-center justify-between mb-8">
              <button onClick={goHome} className="flex items-center gap-2 text-[#6B5B95] font-semibold text-sm hover:gap-3 transition-all duration-200">
                <ArrowLeft size={16} /> Back to Shop
              </button>
              {cartCount > 0 && (
                <button onClick={() => setCartOpen(true)}
                  className="flex items-center gap-2 bg-[#6B5B95] text-[#FBF4E8] rounded-full px-4 py-2 text-sm font-semibold hover:bg-[#5a4a84] transition shadow-md">
                  <ShoppingCart size={14} /> Bag ({cartCount})
                </button>
              )}
            </div>

            {/* Header */}
            <div className="mb-8">
              <Overline>Filtered by intention</Overline>
              <h2 className="font-display mt-3 text-3xl sm:text-4xl text-[#3A2E5D]">
                #{activeTag} <span className="text-[#9B8AC4] text-xl font-sans font-normal">· {tagProducts.length} products</span>
              </h2>
              <p className="mt-2 text-[#3A2E5D]/60 text-sm">
                Showing all products tagged with <strong>#{activeTag}</strong> across every category.
              </p>
            </div>

            {/* Tag chips to switch */}
            {allTags.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {allTags.map((t) => {
                  const slug = t.slug || t;
                  return (
                    <button
                      key={slug}
                      onClick={() => openTag(slug)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                        slug === activeTag
                          ? "bg-[#6B5B95] text-[#FBF4E8]"
                          : "border border-[#C8B6E2] bg-white/70 text-[#9B8AC4] hover:text-[#3A2E5D] hover:bg-[#F0EBF9]"
                      }`}
                    >
                      #{slug}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Products */}
            {tagProducts.length === 0 ? (
              <div className="text-center py-20 text-[#9B8AC4]">
                <Sparkles size={40} className="mx-auto mb-4 opacity-40" />
                <p className="font-display text-xl text-[#3A2E5D]">No products with this tag</p>
                <button onClick={goHome} className="mt-5 px-5 py-2 rounded-full bg-[#6B5B95] text-[#FBF4E8] text-sm font-semibold hover:bg-[#5a4a84] transition">
                  ← Browse all categories
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                {tagProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={addToCart}
                    cartQty={cartQtyFor(product.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Cart sidebar ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {cartOpen && (
          <CartSidebar
            cart={cart}
            onAdd={addToCart}
            onRemove={removeFromCart}
            onClear={() => setCart([])}
            onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
            onClose={() => setCartOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Checkout dialog ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {checkoutOpen && (
          <CheckoutDialog
            cart={cart}
            onClose={() => setCheckoutOpen(false)}
            onSuccess={handleOrderSuccess}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
