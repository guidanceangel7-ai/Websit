import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Plus, Minus, X, Sparkles, Package,
  Check, Loader2, ChevronRight, Search, SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Overline, StarDivider } from "./Decor";
import AvailableOffers from "./AvailableOffers";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_test_PLACEHOLDER";

// ── Gradient palette for products without images ────────────────────────────
const GRADIENTS = [
  "from-[#C8B6E2] to-[#9B8AC4]",
  "from-[#EBB99A] to-[#D9956A]",
  "from-[#F4C6D6] to-[#EBB99A]",
  "from-[#9B8AC4] to-[#6B5B95]",
  "from-[#C8B6E2] to-[#F4C6D6]",
  "from-[#EBB99A] to-[#C8B6E2]",
];

function gradientFor(id) {
  if (!id) return GRADIENTS[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

// ── Load Razorpay script ─────────────────────────────────────────────────────
function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// ── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-[#C8B6E2] overflow-hidden animate-pulse">
      <div className="aspect-square bg-gradient-to-br from-[#E6DDF1] to-[#C8B6E2]/40" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-[#E6DDF1] rounded-full w-1/3" />
        <div className="h-4 bg-[#E6DDF1] rounded-full w-2/3" />
        <div className="h-3 bg-[#E6DDF1] rounded-full w-full" />
        <div className="flex justify-between items-center mt-3">
          <div className="h-5 bg-[#E6DDF1] rounded-full w-1/4" />
          <div className="h-7 bg-[#C8B6E2] rounded-full w-1/4" />
        </div>
      </div>
    </div>
  );
}

// ── Product card ─────────────────────────────────────────────────────────────
function ProductCard({ product, onAdd, cartQty }) {
  const grad = gradientFor(product.id);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
      className="group relative bg-white/90 rounded-3xl border border-[#C8B6E2]/70 overflow-hidden shadow-sm hover:shadow-[0_8px_32px_rgba(107,91,149,0.18)] transition-shadow duration-300"
    >
      {/* Badge */}
      {product.badge && (
        <div className="absolute top-3 left-3 z-10 bg-[#EBB99A] text-[#3A2E5D] text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full shadow-sm">
          {product.badge}
        </div>
      )}

      {/* Out of stock */}
      {!product.in_stock && (
        <div className="absolute inset-0 z-10 bg-white/75 backdrop-blur-[2px] flex items-center justify-center rounded-3xl">
          <span className="bg-[#3A2E5D] text-[#FBF4E8] text-[10px] font-bold tracking-widest uppercase px-4 py-2 rounded-full">
            Out of Stock
          </span>
        </div>
      )}

      {/* Image */}
      <div className={`aspect-square overflow-hidden bg-gradient-to-br ${grad}`}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles size={44} className="text-white/60" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {product.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="text-[9px] tracking-wider uppercase text-[#9B8AC4] bg-[#F0EBF9] rounded-full px-2 py-0.5 font-medium"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <h3 className="font-display text-[15px] leading-snug text-[#3A2E5D] font-semibold">
          {product.name}
        </h3>
        {product.blurb && (
          <p className="mt-1 text-[12px] text-[#3A2E5D]/60 leading-relaxed line-clamp-2">
            {product.blurb}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="font-bold text-[#3A2E5D] text-base">
            ₹{product.price_inr?.toLocaleString("en-IN")}
          </span>
          {product.in_stock && (
            <button
              onClick={() => onAdd(product)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold tracking-wide transition-all duration-200 ${
                cartQty > 0
                  ? "bg-[#EBB99A] text-[#3A2E5D] shadow-sm"
                  : "bg-[#6B5B95] text-[#FBF4E8] hover:bg-[#5a4a84] shadow-[0_4px_14px_rgba(107,91,149,0.35)]"
              }`}
            >
              {cartQty > 0 ? (
                <><Check size={11} /> In bag ({cartQty})</>
              ) : (
                <><Plus size={11} /> Add</>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Cart sidebar ─────────────────────────────────────────────────────────────
function CartSidebar({ cart, onAdd, onRemove, onCheckout, onClose }) {
  const total = cart.reduce((s, i) => s + (i.price_inr || 0) * i.qty, 0);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative bg-[#FBF4E8] w-full max-w-[360px] h-full flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="bg-[#6B5B95] text-[#FBF4E8] px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingCart size={18} />
            <span className="font-display text-lg">Your Bag</span>
            {cart.length > 0 && (
              <span className="bg-[#EBB99A] text-[#3A2E5D] text-[10px] font-bold px-2 py-0.5 rounded-full">
                {cart.reduce((s, i) => s + i.qty, 0)} items
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition"
          >
            <X size={14} />
          </button>
        </div>

        {/* Items */}
        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <ShoppingCart size={42} className="text-[#C8B6E2] mb-4" />
            <p className="font-display text-lg text-[#3A2E5D]">Your bag is empty</p>
            <p className="text-sm text-[#9B8AC4] mt-1.5">Add something magical ✦</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 bg-white/70 rounded-2xl p-3 border border-[#C8B6E2]/60"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradientFor(item.id)} flex items-center justify-center flex-shrink-0`}>
                    <Sparkles size={16} className="text-white/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#3A2E5D] leading-tight truncate">{item.name}</p>
                    <p className="text-[11px] text-[#9B8AC4] mt-0.5">₹{item.price_inr?.toLocaleString("en-IN")}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        onClick={() => onRemove(item.id)}
                        className="w-6 h-6 rounded-full bg-[#E6DDF1] text-[#6B5B95] flex items-center justify-center hover:bg-[#C8B6E2] transition text-xs font-bold"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-sm font-bold text-[#3A2E5D] w-5 text-center">{item.qty}</span>
                      <button
                        onClick={() => onAdd(item)}
                        className="w-6 h-6 rounded-full bg-[#E6DDF1] text-[#6B5B95] flex items-center justify-center hover:bg-[#C8B6E2] transition"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-[#3A2E5D]">₹{(item.price_inr * item.qty).toLocaleString("en-IN")}</p>
                    <button onClick={() => { for (let i = 0; i < item.qty; i++) onRemove(item.id); }} className="text-[10px] text-[#9B8AC4] hover:text-red-400 mt-1 transition">remove</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-[#C8B6E2] flex-shrink-0 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#3A2E5D]/70">Subtotal</span>
                <span className="font-bold text-[#3A2E5D]">₹{total.toLocaleString("en-IN")}</span>
              </div>
              <button
                onClick={onCheckout}
                className="w-full py-3.5 rounded-2xl bg-[#6B5B95] text-[#FBF4E8] font-semibold text-sm hover:bg-[#5a4a84] transition flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(107,91,149,0.3)]"
              >
                <Package size={15} />
                Checkout
                <ChevronRight size={14} />
              </button>
              <p className="text-center text-[10px] text-[#9B8AC4]">Ships pan-India · 5–7 business days</p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

// ── Checkout dialog ──────────────────────────────────────────────────────────
function CheckoutDialog({ cart, onClose, onSuccess }) {
  const [couponCode, setCouponCode] = useState("");
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_name: "", customer_email: "", customer_phone: "",
    address_line1: "", address_line2: "", city: "", state: "", postal_code: "", notes: "",
  });

  const subtotal = cart.reduce((s, i) => s + (i.price_inr || 0) * i.qty, 0);
  const discount = couponInfo?.discount_inr || 0;
  const total = Math.max(0, subtotal - discount);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    try {
      const res = await axios.post(`${API}/promotions/validate`, { code, base_inr: subtotal, kind: "products" });
      setCouponInfo(res.data);
      toast.success(`${code} applied — ₹${res.data.discount_inr} off ✦`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid or expired code");
      setCouponInfo(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const req = ["customer_name", "customer_email", "customer_phone", "address_line1", "city", "state", "postal_code"];
    for (const k of req) {
      if (!form[k].trim()) { toast.error("Please fill in all required fields"); return; }
    }
    setSubmitting(true);
    try {
      const payload = {
        items: cart.map((i) => ({ product_id: i.id, quantity: i.qty })),
        customer_name: form.customer_name, customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        address: { line1: form.address_line1, line2: form.address_line2, city: form.city, state: form.state, postal_code: form.postal_code, country: "India" },
        notes: form.notes,
        coupon_code: couponCode.trim().toUpperCase() || null,
      };
      const res = await axios.post(`${API}/orders/create-order`, payload);
      const { order_id, razorpay_order_id, amount_paise, is_mock } = res.data;
      if (is_mock) {
        await axios.post(`${API}/orders/verify-payment`, { order_id, razorpay_order_id, razorpay_payment_id: `pay_mock_${Date.now()}` });
        toast.success("Order placed! 🛍️"); onSuccess(); return;
      }
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error("Payment gateway failed to load"); setSubmitting(false); return; }
      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY_ID, amount: amount_paise, currency: "INR",
        name: "Guidance Angel Shop", description: `Order #${order_id.slice(0, 8)}`,
        order_id: razorpay_order_id,
        prefill: { name: form.customer_name, email: form.customer_email, contact: form.customer_phone },
        theme: { color: "#6B5B95" },
        handler: async (response) => {
          try {
            await axios.post(`${API}/orders/verify-payment`, { order_id, razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature });
            toast.success("Order placed! 🛍️"); onSuccess();
          } catch { toast.error("Payment verification failed. Contact support."); }
        },
        modal: { ondismiss: () => setSubmitting(false) },
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
      setSubmitting(false);
    }
  };

  const inp = "w-full rounded-xl border border-[#C8B6E2] bg-white/80 px-3 py-2.5 text-sm text-[#3A2E5D] placeholder:text-[#9B8AC4]/60 focus:outline-none focus:ring-2 focus:ring-[#6B5B95] transition";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="relative bg-[#FBF4E8] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 z-10 bg-[#6B5B95] text-[#FBF4E8] px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#EBB99A]/80">Guidance Angel</div>
            <div className="font-display text-xl mt-0.5">Checkout</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Order summary */}
          <div className="rounded-2xl bg-white/70 border border-[#C8B6E2] p-4 space-y-2">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between text-sm text-[#3A2E5D]">
                <span>{item.name} <span className="text-[#9B8AC4]">×{item.qty}</span></span>
                <span className="font-semibold">₹{(item.price_inr * item.qty).toLocaleString("en-IN")}</span>
              </div>
            ))}
            <div className="border-t border-[#C8B6E2] pt-2 space-y-1">
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span><span>−₹{discount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[#3A2E5D]">
                <span>Total</span><span>₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Coupon */}
          <div>
            <AvailableOffers kind="products" appliedCode={couponCode.trim().toUpperCase()} onApply={(c) => setCouponCode(c)} />
            <div className="flex gap-2 mt-2">
              <input className={`${inp} flex-1`} placeholder="Coupon code" value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponInfo(null); }} />
              <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}
                className="px-4 py-2 rounded-xl bg-[#6B5B95] text-white text-sm font-semibold hover:bg-[#5a4a84] transition disabled:opacity-50">
                {couponLoading ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#9B8AC4] font-bold">Your Details</p>
            <input className={inp} placeholder="Full name *" value={form.customer_name} onChange={set("customer_name")} />
            <input className={inp} type="email" placeholder="Email *" value={form.customer_email} onChange={set("customer_email")} />
            <input className={inp} type="tel" placeholder="Phone / WhatsApp *" value={form.customer_phone} onChange={set("customer_phone")} />
          </div>

          {/* Address */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#9B8AC4] font-bold">Shipping Address</p>
            <input className={inp} placeholder="Address line 1 *" value={form.address_line1} onChange={set("address_line1")} />
            <input className={inp} placeholder="Address line 2" value={form.address_line2} onChange={set("address_line2")} />
            <div className="grid grid-cols-2 gap-2">
              <input className={inp} placeholder="City *" value={form.city} onChange={set("city")} />
              <input className={inp} placeholder="State *" value={form.state} onChange={set("state")} />
            </div>
            <input className={inp} placeholder="PIN code *" value={form.postal_code} onChange={set("postal_code")} />
            <textarea className={`${inp} min-h-[56px] resize-none`} placeholder="Notes (optional)" value={form.notes} onChange={set("notes")} />
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-4 rounded-2xl bg-[#6B5B95] text-[#FBF4E8] font-bold text-sm hover:bg-[#5a4a84] transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_8px_28px_rgba(107,91,149,0.35)]">
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : <><Package size={16} /> Place Order · ₹{total.toLocaleString("en-IN")}</>}
          </button>
          <p className="text-center text-[11px] text-[#9B8AC4]">Secure · Razorpay · Ships pan-India</p>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main Shop ────────────────────────────────────────────────────────────────
export default function Shop() {
  const [categories, setCategories] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [activeCat, setActiveCat] = useState("all");
  const [activeTags, setActiveTags] = useState([]); // multi-tag support
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderDone, setOrderDone] = useState(false);

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

  // Flat list of all products
  const allProducts = useMemo(
    () => categories.flatMap((c) => (c.products || []).map((p) => ({ ...p, _catName: c.name }))),
    [categories]
  );

  // Filtered products
  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProducts.filter((p) => {
      const catOk = activeCat === "all" || p.product_category_id === activeCat;
      const tagOk = activeTags.length === 0 || activeTags.every((t) => (p.tags || []).includes(t));
      const searchOk = !q || p.name?.toLowerCase().includes(q) || (p.tags || []).some((t) => t.toLowerCase().includes(q)) || p.blurb?.toLowerCase().includes(q);
      return catOk && tagOk && searchOk;
    });
  }, [allProducts, activeCat, activeTags, search]);

  const toggleTag = (slug) => {
    setActiveTags((prev) =>
      prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug]
    );
  };

  const clearFilters = () => { setActiveCat("all"); setActiveTags([]); setSearch(""); };

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
    toast.success(`${product.name} added ✦`);
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.id === productId);
      if (idx < 0) return prev;
      const item = prev[idx];
      if (item.qty <= 1) return prev.filter((i) => i.id !== productId);
      const next = [...prev]; next[idx] = { ...next[idx], qty: item.qty - 1 }; return next;
    });
  }, []);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const hasActiveFilters = activeCat !== "all" || activeTags.length > 0 || search.trim();

  const handleOrderSuccess = () => {
    setCart([]); setCheckoutOpen(false); setCartOpen(false);
    setOrderDone(true); setTimeout(() => setOrderDone(false), 5000);
  };

  return (
    <section id="shop" className="relative py-20 sm:py-28 bg-gradient-to-b from-[#FBF4E8] via-[#F5EEF8] to-[#FBF4E8]">

      {/* Floating cart */}
      <AnimatePresence>
        {cartCount > 0 && !cartOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            onClick={() => setCartOpen(true)}
            className="fixed bottom-6 right-6 z-40 bg-[#6B5B95] text-[#FBF4E8] rounded-full w-14 h-14 flex items-center justify-center shadow-[0_8px_28px_rgba(107,91,149,0.5)] hover:bg-[#5a4a84] transition"
          >
            <ShoppingCart size={22} />
            <span className="absolute -top-1 -right-1 bg-[#EBB99A] text-[#3A2E5D] text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cartCount}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Order success banner */}
      <AnimatePresence>
        {orderDone && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#6B5B95] text-[#FBF4E8] px-6 py-3 rounded-full shadow-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap"
          >
            <Check size={15} /> Order placed! Ships in 5–7 business days.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-5 sm:px-10">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
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

        {/* ── Filters ────────────────────────────────────────────────────────── */}
        <div className="space-y-4 mb-8">
          {/* Search + filter toggle */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9B8AC4]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, tags…"
                className="w-full pl-9 pr-4 py-2.5 rounded-full border border-[#C8B6E2] bg-white/80 text-sm text-[#3A2E5D] placeholder:text-[#9B8AC4]/70 focus:outline-none focus:ring-2 focus:ring-[#6B5B95] transition"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B8AC4] hover:text-[#3A2E5D]">
                  <X size={13} />
                </button>
              )}
            </div>
            <button onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-sm font-medium transition ${showFilters ? "bg-[#6B5B95] border-[#6B5B95] text-[#FBF4E8]" : "border-[#C8B6E2] bg-white/70 text-[#3A2E5D] hover:bg-[#E6DDF1]"}`}>
              <SlidersHorizontal size={14} /> Filters {activeTags.length > 0 && `(${activeTags.length})`}
            </button>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-[#9B8AC4] hover:text-[#3A2E5D] transition underline">
                Clear all
              </button>
            )}
          </div>

          {/* Category tabs */}
          {!loading && categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCat("all")}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${activeCat === "all" ? "bg-[#6B5B95] text-[#FBF4E8] shadow-sm" : "bg-white/70 border border-[#C8B6E2] text-[#3A2E5D] hover:bg-[#E6DDF1]"}`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id === activeCat ? "all" : cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${activeCat === cat.id ? "bg-[#6B5B95] text-[#FBF4E8] shadow-sm" : "bg-white/70 border border-[#C8B6E2] text-[#3A2E5D] hover:bg-[#E6DDF1]"}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Tag chips — shown when filters panel open */}
          <AnimatePresence>
            {showFilters && allTags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 pt-1">
                  {allTags.map((t) => {
                    const slug = t.slug || t;
                    const label = t.label || t.slug || t;
                    const active = activeTags.includes(slug);
                    return (
                      <button
                        key={slug}
                        onClick={() => toggleTag(slug)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${active ? "bg-[#EBB99A] text-[#3A2E5D] shadow-sm" : "bg-white/60 border border-[#C8B6E2] text-[#9B8AC4] hover:text-[#3A2E5D] hover:bg-[#F0EBF9]"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Results count ───────────────────────────────────────────────────── */}
        {!loading && (
          <p className="text-xs text-[#9B8AC4] mb-5">
            {visibleProducts.length === allProducts.length
              ? `${allProducts.length} products`
              : `${visibleProducts.length} of ${allProducts.length} products`}
          </p>
        )}

        {/* ── Product grid ────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="text-center py-24">
            <Sparkles size={40} className="mx-auto mb-4 text-[#C8B6E2]" />
            <p className="font-display text-xl text-[#3A2E5D]">No products found</p>
            <p className="text-sm text-[#9B8AC4] mt-2">Try a different filter or search term</p>
            <button onClick={clearFilters} className="mt-5 px-5 py-2 rounded-full bg-[#6B5B95] text-[#FBF4E8] text-sm font-semibold hover:bg-[#5a4a84] transition">
              Show all products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={addToCart}
                cartQty={cart.find((i) => i.id === product.id)?.qty || 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cart sidebar */}
      <AnimatePresence>
        {cartOpen && (
          <CartSidebar
            cart={cart} onAdd={addToCart} onRemove={removeFromCart}
            onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
            onClose={() => setCartOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Checkout */}
      <AnimatePresence>
        {checkoutOpen && (
          <CheckoutDialog cart={cart} onClose={() => setCheckoutOpen(false)} onSuccess={handleOrderSuccess} />
        )}
      </AnimatePresence>
    </section>
  );
}
