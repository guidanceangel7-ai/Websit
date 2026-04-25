import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { BRAND } from "../lib/brand";
import AvailableOffers from "./AvailableOffers";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const RAZORPAY_KEY_ID =
  process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_test_PLACEHOLDER";

const STEPS = ["cart", "address", "pay"];
const STEP_LABELS = {
  cart: "Your Cart",
  address: "Shipping Details",
  pay: "Confirm & Pay",
};

function Stepper({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition ${
              i < current
                ? "bg-[#EBB99A] text-[#3A2E5D] shadow-[0_4px_14px_rgba(235,185,154,0.5)]"
                : i === current
                  ? "bg-white text-[#6B5B95] ring-4 ring-white/40"
                  : "bg-white/20 text-white/70 border border-white/30"
            }`}
          >
            {i < current ? <Check size={14} strokeWidth={3} /> : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 w-8 sm:w-12 ${i < current ? "bg-[#EBB99A]" : "bg-white/30"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function ShopCheckoutDialog({ open, onOpenChange, initialProduct }) {
  const [step, setStep] = useState(0);
  const [cart, setCart] = useState([]); // [{ product, qty }]
  const [submitting, setSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "India",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      setStep(0);
      setCart(
        initialProduct
          ? [{ product: initialProduct, qty: 1 }]
          : []
      );
      setForm({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "India",
        notes: "",
      });
      setCouponCode("");
      setCouponInfo(null);
    }
  }, [open, initialProduct]);

  const applyCoupon = async (codeArg) => {
    const code = (codeArg || couponCode || "").trim().toUpperCase();
    if (!code || cart.length === 0) return;
    setCouponCode(code);
    setCouponLoading(true);
    try {
      const res = await axios.post(`${API}/promotions/validate`, {
        code,
        kind: "products",
        base_inr: total,
      });
      setCouponInfo(res.data);
      toast.success(`Coupon applied — saved ₹${res.data.discount_inr.toLocaleString("en-IN")} ✦`);
    } catch (e) {
      setCouponInfo(null);
      toast.error(e?.response?.data?.detail || "Invalid coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const total = useMemo(
    () => cart.reduce((s, item) => s + (item.product.price_inr || 0) * item.qty, 0),
    [cart]
  );

  const incQty = (i, d) => {
    const next = [...cart];
    next[i] = { ...next[i], qty: Math.max(1, next[i].qty + d) };
    setCart(next);
  };
  const removeItem = (i) => {
    const next = [...cart];
    next.splice(i, 1);
    setCart(next);
    if (next.length === 0) onOpenChange(false);
  };

  const cur = STEPS[step];
  const canNext = useMemo(() => {
    if (cur === "cart") return cart.length > 0;
    if (cur === "address") {
      return (
        form.customer_name.trim().length > 1 &&
        /^\S+@\S+\.\S+$/.test(form.customer_email) &&
        form.customer_phone.trim().length >= 7 &&
        form.line1.trim().length > 2 &&
        form.city.trim().length > 1 &&
        form.state.trim().length > 1 &&
        form.postal_code.trim().length >= 4
      );
    }
    return true;
  }, [cur, cart, form]);

  const goNext = () => {
    if (!canNext) return;
    if (step < STEPS.length - 1) setStep(step + 1);
  };
  const goBack = () => step > 0 && setStep(step - 1);

  const handlePay = async () => {
    setSubmitting(true);
    try {
      const payload = {
        items: cart.map((c) => ({ product_id: c.product.id, quantity: c.qty })),
        customer_name: form.customer_name.trim(),
        customer_email: form.customer_email.trim(),
        customer_phone: form.customer_phone.trim(),
        address: {
          line1: form.line1.trim(),
          line2: form.line2.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postal_code: form.postal_code.trim(),
          country: form.country.trim() || "India",
        },
        notes: form.notes.trim(),
        coupon_code: couponInfo ? couponCode.trim().toUpperCase() : null,
      };
      const res = await axios.post(`${API}/orders/create-order`, payload);
      const { order_id, razorpay_order_id, amount_paise, is_mock, razorpay_key_id } = res.data;

      if (is_mock) {
        await axios.post(`${API}/orders/verify-payment`, {
          order_id,
          razorpay_order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
        });
        toast.success("Order placed (mock payment) ✦", {
          description: "We'll dispatch your sacred items soon.",
        });
        onOpenChange(false);
        return;
      }

      if (!window.Razorpay) {
        toast.error("Payment SDK not loaded. Please refresh.");
        return;
      }
      const options = {
        key: razorpay_key_id || RAZORPAY_KEY_ID,
        amount: amount_paise,
        currency: "INR",
        name: BRAND.name,
        description: `Order · ${cart.length} item${cart.length > 1 ? "s" : ""}`,
        order_id: razorpay_order_id,
        prefill: {
          name: form.customer_name,
          email: form.customer_email,
          contact: form.customer_phone,
        },
        notes: { order_id },
        theme: { color: "#6B5B95" },
        handler: async function (response) {
          try {
            await axios.post(`${API}/orders/verify-payment`, {
              order_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success("Order placed ✦", {
              description: "Check your email for confirmation.",
            });
            onOpenChange(false);
          } catch (err) {
            toast.error("Payment verification failed");
          }
        },
        modal: {
          ondismiss: () => toast("Payment cancelled."),
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start checkout");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="shop-checkout-dialog"
        className="max-w-2xl !bg-[#FFFFFF] border-0 rounded-3xl p-0 overflow-hidden shadow-[0_30px_80px_-20px_rgba(58,46,93,0.6)]"
      >
        <div className="relative bg-gradient-to-br from-[#6B5B95] via-[#9B8AC4] to-[#6B5B95] px-6 sm:px-8 pt-7 pb-6">
          <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full bg-[#EBB99A]/40 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-10 w-44 h-44 rounded-full bg-[#F4C6D6]/40 blur-3xl pointer-events-none" />
          <DialogHeader className="relative">
            <div className="text-center text-[10px] tracking-[0.32em] uppercase text-[#EBB99A] font-semibold mb-2">
              ✦ Sacred Shop ✦
            </div>
            <DialogTitle className="font-display text-2xl sm:text-3xl text-white text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
              {STEP_LABELS[cur]}
            </DialogTitle>
            <DialogDescription className="text-center text-white/85 text-sm">
              {cart.length > 0
                ? `${cart.length} item${cart.length > 1 ? "s" : ""} · ₹${total.toLocaleString("en-IN")}`
                : "Your cart is empty"}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 relative">
            <Stepper current={step} />
          </div>
        </div>

        <div className="px-6 sm:px-8 py-6 max-h-[60vh] overflow-y-auto bg-white">
          {cur === "cart" && (
            <div className="space-y-3">
              {cart.length === 0 && (
                <div className="text-center py-10 text-ink-plum/60">
                  Your cart is empty. Pick a product first.
                </div>
              )}
              {cart.map((item, i) => (
                <div
                  key={item.product.id}
                  data-testid={`cart-item-${item.product.id}`}
                  className="flex items-center gap-4 rounded-2xl border-2 border-[#EBB99A]/30 bg-[#FBF4E8] p-3 sm:p-4"
                >
                  {item.product.image_url ? (
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-peach/30"
                    />
                  ) : (
                    <div
                      className={`w-16 h-16 rounded-xl bg-gradient-to-br ${item.product.accent || "from-[#C8B6E2] to-[#E6DDF1]"} shrink-0`}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base text-ink-plum truncate">
                      {item.product.name}
                    </div>
                    <div className="text-sm text-ink-plum/70">
                      ₹{item.product.price_inr?.toLocaleString("en-IN")} each
                    </div>
                  </div>
                  <div className="inline-flex items-center bg-white border-2 border-peach/30 rounded-full">
                    <button
                      data-testid={`cart-dec-${i}`}
                      onClick={() => incQty(i, -1)}
                      className="w-8 h-8 inline-flex items-center justify-center text-lavender-deep hover:bg-peach/15 rounded-full"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-2 text-sm font-semibold text-ink-plum">
                      {item.qty}
                    </span>
                    <button
                      data-testid={`cart-inc-${i}`}
                      onClick={() => incQty(i, 1)}
                      className="w-8 h-8 inline-flex items-center justify-center text-lavender-deep hover:bg-peach/15 rounded-full"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="font-display text-lavender-deep text-lg w-24 text-right">
                    ₹{((item.product.price_inr || 0) * item.qty).toLocaleString("en-IN")}
                  </div>
                  <button
                    data-testid={`cart-remove-${i}`}
                    onClick={() => removeItem(i)}
                    className="text-ink-plum/50 hover:text-red-500 text-xs"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {cart.length > 0 && (
                <div className="flex items-center justify-between mt-2 px-2 text-sm">
                  <div className="text-ink-plum/60">Order total</div>
                  <div className="font-display text-2xl text-lavender-deep">
                    ₹{total.toLocaleString("en-IN")}
                  </div>
                </div>
              )}
            </div>
          )}

          {cur === "address" && (
            <div className="grid sm:grid-cols-2 gap-4" data-testid="step-address">
              <div className="sm:col-span-2">
                <Label htmlFor="customer_name" className="text-ink-plum font-semibold">
                  Full name <span className="text-peach-deep">*</span>
                </Label>
                <Input
                  id="customer_name"
                  data-testid="ship-name"
                  value={form.customer_name}
                  placeholder="Your beautiful name"
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  className="mt-2 rounded-xl bg-[#FBF4E8] border-2 border-peach/40 text-ink-plum placeholder:text-ink-plum/40 h-11"
                />
              </div>
              <div>
                <Label htmlFor="customer_email" className="text-ink-plum font-semibold">
                  Email <span className="text-peach-deep">*</span>
                </Label>
                <Input
                  id="customer_email"
                  type="email"
                  data-testid="ship-email"
                  value={form.customer_email}
                  onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                  className="mt-2 rounded-xl bg-[#FBF4E8] border-2 border-peach/40 text-ink-plum h-11"
                />
              </div>
              <div>
                <Label htmlFor="customer_phone" className="text-ink-plum font-semibold">
                  Phone / WhatsApp <span className="text-peach-deep">*</span>
                </Label>
                <Input
                  id="customer_phone"
                  data-testid="ship-phone"
                  placeholder="+91 98XXX XXXXX"
                  value={form.customer_phone}
                  onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                  className="mt-2 rounded-xl bg-[#FBF4E8] border-2 border-peach/40 text-ink-plum h-11"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="line1" className="text-ink-plum font-semibold">
                  Address line 1 <span className="text-peach-deep">*</span>
                </Label>
                <Input
                  id="line1"
                  data-testid="ship-line1"
                  placeholder="House / flat / street"
                  value={form.line1}
                  onChange={(e) => setForm({ ...form, line1: e.target.value })}
                  className="mt-2 rounded-xl bg-[#FBF4E8] border-2 border-peach/40 text-ink-plum h-11"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="line2" className="text-ink-plum font-semibold">
                  Address line 2 <span className="text-ink-plum/40 text-xs">(optional)</span>
                </Label>
                <Input
                  id="line2"
                  data-testid="ship-line2"
                  placeholder="Apartment, landmark, area"
                  value={form.line2}
                  onChange={(e) => setForm({ ...form, line2: e.target.value })}
                  className="mt-2 rounded-xl bg-[#FBF4E8] border-2 border-peach/40 text-ink-plum h-11"
                />
              </div>
              <div>
                <Label htmlFor="city" className="text-ink-plum font-semibold">
                  City <span className="text-peach-deep">*</span>
                </Label>
                <Input
                  id="city"
                  data-testid="ship-city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="mt-2 rounded-xl bg-[#FBF4E8] border-2 border-peach/40 text-ink-plum h-11"
                />
              </div>
              <div>
                <Label htmlFor="state" className="text-ink-plum font-semibold">
                  State <span className="text-peach-deep">*</span>
                </Label>
                <Input
                  id="state"
                  data-testid="ship-state"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="mt-2 rounded-xl bg-[#FBF4E8] border-2 border-peach/40 text-ink-plum h-11"
                />
              </div>
              <div>
                <Label htmlFor="postal_code" className="text-ink-plum font-semibold">
                  PIN / Postal code <span className="text-peach-deep">*</span>
                </Label>
                <Input
                  id="postal_code"
                  data-testid="ship-pin"
                  value={form.postal_code}
                  onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                  className="mt-2 rounded-xl bg-[#FBF4E8] border-2 border-peach/40 text-ink-plum h-11"
                />
              </div>
              <div>
                <Label htmlFor="country" className="text-ink-plum font-semibold">
                  Country
                </Label>
                <Input
                  id="country"
                  data-testid="ship-country"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="mt-2 rounded-xl bg-[#FBF4E8] border-2 border-peach/40 text-ink-plum h-11"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes" className="text-ink-plum font-semibold">
                  Order notes <span className="text-ink-plum/40 text-xs">(optional)</span>
                </Label>
                <Textarea
                  id="notes"
                  data-testid="ship-notes"
                  rows={2}
                  placeholder="Anything we should know? Special intentions for the items?"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mt-2 rounded-xl bg-[#FBF4E8] border-2 border-peach/40 text-ink-plum"
                />
              </div>
            </div>
          )}

          {cur === "pay" && (
            <div data-testid="step-pay" className="space-y-5">
              <div className="rounded-2xl bg-gradient-to-br from-[#FBF4E8] via-white to-[#F4C6D6]/15 border-2 border-[#EBB99A]/40 p-6 shadow-[0_4px_18px_-4px_rgba(107,91,149,0.15)]">
                <div className="text-[11px] uppercase tracking-[0.32em] text-[#D9A382] font-bold flex items-center gap-2">
                  <Sparkles size={14} className="text-[#EBB99A]" /> Order Summary
                </div>
                <div className="mt-4 space-y-2">
                  {cart.map((c) => (
                    <div key={c.product.id} className="flex items-center justify-between text-sm">
                      <div className="text-ink-plum truncate">
                        {c.product.name} <span className="text-ink-plum/50">× {c.qty}</span>
                      </div>
                      <div className="text-ink-plum font-medium">
                        ₹{((c.product.price_inr || 0) * c.qty).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t-2 border-dashed border-[#EBB99A]/40 space-y-2.5">
                  {couponInfo && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-emerald-700 inline-flex items-center gap-2">
                        <Sparkles size={14} className="text-[#EBB99A]" />
                        Coupon{" "}
                        <span className="font-mono font-bold">
                          {couponCode.toUpperCase()}
                        </span>{" "}
                        applied
                      </div>
                      <div className="text-emerald-700 font-medium">
                        − ₹{couponInfo.discount_inr.toLocaleString("en-IN")}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-[#6B5B95] uppercase tracking-[0.2em] font-bold">
                      {couponInfo ? "Final amount" : "Total"}
                    </div>
                    <div className="font-display text-3xl bg-gradient-to-r from-[#6B5B95] to-[#9B8AC4] bg-clip-text text-transparent">
                      ₹{(couponInfo ? couponInfo.final_inr : total).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-[#EBB99A]/30 text-sm text-ink-plum/80 leading-relaxed">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[#9B8AC4] font-bold mb-1">
                    Shipping to
                  </div>
                  {form.customer_name}
                  <br />
                  {form.line1}
                  {form.line2 ? `, ${form.line2}` : ""}
                  <br />
                  {form.city}, {form.state} {form.postal_code}
                  <br />
                  {form.country} · {form.customer_phone}
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-[#EBB99A]/15 to-[#F4C6D6]/15 border-2 border-[#EBB99A]/30 px-5 py-4 text-sm text-[#3A2E5D]/85 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#EBB99A] to-[#F4C6D6] flex items-center justify-center text-white shrink-0">
                  <ShoppingBag size={16} />
                </div>
                <div className="leading-relaxed">
                  Secure payment via{" "}
                  <span className="font-semibold text-[#6B5B95]">Razorpay</span>{" "}
                  — UPI, cards, netbanking, wallets. You'll receive an email + WhatsApp confirmation immediately after payment.
                </div>
              </div>

              {!couponInfo && (
                <AvailableOffers
                  kind="products"
                  appliedCode={couponInfo ? couponCode : null}
                  onApply={(code) => applyCoupon(code)}
                />
              )}

              {!couponInfo && (
                <div className="rounded-2xl bg-white border-2 border-dashed border-[#EBB99A]/50 px-5 py-4">
                  <div className="text-[10px] uppercase tracking-[0.32em] text-[#D9A382] font-bold flex items-center gap-2">
                    <Sparkles size={12} className="text-[#EBB99A]" /> Have a coupon?
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      data-testid="shop-coupon-input"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 rounded-xl border-2 border-peach/40 bg-[#FBF4E8] px-3 py-2 text-ink-plum placeholder:text-ink-plum/40 focus:border-lavender-deep outline-none uppercase tracking-wider font-mono text-sm"
                    />
                    <button
                      type="button"
                      data-testid="shop-coupon-apply"
                      disabled={!couponCode.trim() || couponLoading}
                      onClick={() => applyCoupon()}
                      className="inline-flex items-center gap-1 bg-lavender-deep text-ivory rounded-xl px-4 py-2 text-sm font-medium hover:bg-lavender-deeper disabled:opacity-50"
                    >
                      {couponLoading ? <Loader2 className="animate-spin" size={14} /> : null}
                      Apply
                    </button>
                  </div>
                </div>
              )}
              {couponInfo && (
                <button
                  type="button"
                  onClick={() => {
                    setCouponInfo(null);
                    setCouponCode("");
                  }}
                  className="text-xs text-ink-plum/60 hover:text-red-500 underline"
                >
                  Remove coupon
                </button>
              )}
            </div>
          )}
        </div>

        <div className="border-t-2 border-[#EBB99A]/30 bg-gradient-to-r from-[#FBF4E8] to-[#F5EAD6] px-6 sm:px-8 py-4 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            data-testid="shop-back"
            onClick={goBack}
            disabled={step === 0}
            className="text-[#6B5B95] hover:bg-[#EBB99A]/15 hover:text-[#5A4C7E] disabled:opacity-40 rounded-full"
          >
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>

          {cur === "pay" ? (
            <Button
              data-testid="shop-pay"
              disabled={submitting}
              onClick={handlePay}
              className="bg-gradient-to-r from-[#6B5B95] to-[#9B8AC4] hover:from-[#5A4C7E] hover:to-[#6B5B95] text-white rounded-full px-8 py-2.5 shadow-[0_8px_24px_-8px_rgba(107,91,149,0.6)] font-medium"
            >
              {submitting ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Pay ₹{(couponInfo ? couponInfo.final_inr : total).toLocaleString("en-IN")} ✦
            </Button>
          ) : (
            <Button
              data-testid="shop-next"
              disabled={!canNext}
              onClick={goNext}
              className="bg-gradient-to-r from-[#6B5B95] to-[#9B8AC4] hover:from-[#5A4C7E] hover:to-[#6B5B95] text-white rounded-full px-8 py-2.5 shadow-[0_8px_24px_-8px_rgba(107,91,149,0.5)] disabled:from-[#C8B6E2] disabled:to-[#C8B6E2] disabled:opacity-60 font-medium"
            >
              Continue <ArrowRight size={16} className="ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
