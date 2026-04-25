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
import { Calendar } from "./ui/calendar";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarHeart,
  Check,
  Clock,
  Headphones,
  Heart,
  Loader2,
  Sparkles,
  Stars,
} from "lucide-react";
import { BRAND } from "../lib/brand";
import AvailableOffers from "./AvailableOffers";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const RAZORPAY_KEY_ID =
  process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_test_PLACEHOLDER";

const CATEGORY_META = {
  tarot_numerology_call: {
    icon: Stars,
    gradient: "from-[#6B5B95] via-[#9B8AC4] to-[#C8B6E2]",
  },
  tarot_numerology_question: {
    icon: Headphones,
    gradient: "from-[#9B8AC4] via-[#C8B6E2] to-[#E6DDF1]",
  },
  akashic: {
    icon: BookOpen,
    gradient: "from-[#EBB99A] via-[#F4C6D6] to-[#C8B6E2]",
  },
  all_in_one: {
    icon: Sparkles,
    gradient: "from-[#9B8AC4] via-[#F4C6D6] to-[#EBB99A]",
  },
  month_ahead: {
    icon: CalendarHeart,
    gradient: "from-[#C8B6E2] via-[#E6DDF1] to-[#F4C6D6]",
  },
  healing: {
    icon: Heart,
    gradient: "from-[#F4C6D6] via-[#EBB99A] to-[#FBE4D5]",
  },
};

const STEPS_LIVE = ["category", "service", "schedule", "details", "pay"];
const STEPS_VOICE = ["category", "service", "details", "pay"];

const STEP_LABELS = {
  category: "Choose a Category",
  service: "Choose a Variant",
  schedule: "Pick a Date & Time",
  details: "Your Details",
  pay: "Confirm & Pay",
};

function Stepper({ current, steps }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition ${
              i < current
                ? "bg-[#EBB99A] text-[#3A2E5D] shadow-[0_4px_14px_rgba(235,185,154,0.5)]"
                : i === current
                  ? "bg-white text-[#6B5B95] ring-4 ring-white/40 shadow-[0_4px_14px_rgba(255,255,255,0.4)]"
                  : "bg-white/20 text-white/70 border border-white/30"
            }`}
          >
            {i < current ? <Check size={14} strokeWidth={3} /> : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 w-8 sm:w-12 ${i < current ? "bg-[#EBB99A]" : "bg-white/30"}`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function BookingDialog({
  open,
  onOpenChange,
  initialService,
  initialCategoryId,
  categories,
  services,
}) {
  const [selectedService, setSelectedService] = useState(initialService || null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    initialCategoryId || initialService?.category || null
  );
  const isVoiceNote = !!selectedService?.is_voice_note;
  const STEPS = isVoiceNote ? STEPS_VOICE : STEPS_LIVE;

  const [step, setStep] = useState(0);
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponInfo, setCouponInfo] = useState(null); // {discount_inr, final_inr, title}
  const [couponLoading, setCouponLoading] = useState(false);

  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    birth_date: "",
    birth_time: "",
    birth_place: "",
    question: "",
    notes: "",
  });

  // Reset state on open
  useEffect(() => {
    if (open) {
      setSelectedService(initialService || null);
      setSelectedCategoryId(
        initialCategoryId || initialService?.category || null
      );
      // initialService → jump to schedule (live) / details (voice note)
      // initialCategoryId → jump to service step
      // otherwise start at category
      if (initialService) {
        setStep(2); // service was selected, go to schedule (live) or details (voice handled by STEPS array)
      } else if (initialCategoryId) {
        setStep(1);
      } else {
        setStep(0);
      }
      setDate(null);
      setSlot(null);
      setSlots([]);
      setCouponCode("");
      setCouponInfo(null);
      setForm({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        birth_date: "",
        birth_time: "",
        birth_place: "",
        question: "",
        notes: "",
      });
      // fetch blocked dates so calendar can disable them
      axios
        .get(`${API}/blocked-dates`)
        .then((r) => setBlockedDates(r.data || []))
        .catch(() => setBlockedDates([]));
    }
  }, [open, initialService, initialCategoryId]);

  // When service is set without a step jump, advance properly
  useEffect(() => {
    // No-op: handled by direct step setters at click time
  }, [selectedService]); // eslint-disable-line

  // Fetch slots when date is picked
  useEffect(() => {
    async function fetchSlots() {
      if (!date || isVoiceNote) return;
      setLoadingSlots(true);
      try {
        const ds = format(date, "yyyy-MM-dd");
        const res = await axios.get(`${API}/slots/${ds}`);
        if (!res.data.is_open) {
          setSlots([]);
        } else {
          setSlots(res.data.slots);
        }
      } catch (e) {
        toast.error("Could not load slots, please try another date.");
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [date, isVoiceNote]);

  const stepLabel = useMemo(() => {
    const cur = STEPS[step];
    return STEP_LABELS[cur] || "Begin Your Journey";
  }, [step, STEPS]);

  const canNext = useMemo(() => {
    const cur = STEPS[step];
    if (cur === "category") return !!selectedCategoryId;
    if (cur === "service") return !!selectedService;
    if (cur === "schedule") return !!date && !!slot;
    if (cur === "details") {
      const ok =
        form.customer_name.trim().length > 1 &&
        /^\S+@\S+\.\S+$/.test(form.customer_email) &&
        form.customer_phone.trim().length >= 7;
      return ok;
    }
    return true;
  }, [step, STEPS, selectedCategoryId, selectedService, date, slot, form]);

  const goNext = () => {
    if (!canNext) return;
    if (step < STEPS.length - 1) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const applyCoupon = async (codeArg) => {
    const code = (codeArg || couponCode || "").trim().toUpperCase();
    if (!code || !selectedService) return;
    setCouponCode(code);
    setCouponLoading(true);
    try {
      const res = await axios.post(`${API}/promotions/validate`, {
        code,
        kind: "services",
        base_inr: selectedService.price_inr,
        target_id: selectedService.id,
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

  const handlePay = async () => {
    if (!selectedService) return;
    setSubmitting(true);
    try {
      const payload = {
        service_id: selectedService.id,
        customer_name: form.customer_name.trim(),
        customer_email: form.customer_email.trim(),
        customer_phone: form.customer_phone.trim(),
        booking_date: isVoiceNote ? null : format(date, "yyyy-MM-dd"),
        booking_slot: isVoiceNote ? null : slot,
        birth_date: form.birth_date || null,
        birth_time: form.birth_time || null,
        birth_place: form.birth_place || null,
        question: form.question || null,
        notes: form.notes || null,
        coupon_code: couponInfo ? couponCode.trim().toUpperCase() : null,
      };
      const res = await axios.post(`${API}/bookings/create-order`, payload);
      const { booking_id, razorpay_order_id, amount_paise, is_mock, razorpay_key_id } =
        res.data;

      if (is_mock) {
        // Mock payment success
        await axios.post(`${API}/bookings/verify-payment`, {
          booking_id,
          razorpay_order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
        });
        toast.success("Booking confirmed (mock payment) ✦", {
          description: `We'll reach out on WhatsApp at ${form.customer_phone}.`,
        });
        onOpenChange(false);
        return;
      }

      if (!window.Razorpay) {
        toast.error("Payment SDK not loaded. Please refresh.");
        return;
      }

      const isMobile =
        typeof navigator !== "undefined" &&
        /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
      const callbackUrl = `${window.location.origin}/payment-success?kind=booking&id=${encodeURIComponent(booking_id)}`;

      const options = {
        key: razorpay_key_id || RAZORPAY_KEY_ID,
        amount: amount_paise,
        currency: "INR",
        name: BRAND.name,
        description: selectedService.name,
        order_id: razorpay_order_id,
        prefill: {
          name: form.customer_name,
          email: form.customer_email,
          contact: form.customer_phone,
        },
        notes: {
          booking_id,
          service: selectedService.name,
        },
        theme: { color: "#6B5B95" },
        // Mobile uses redirect mode for rock-solid UPI / GPay flow.
        // Desktop keeps the inline modal for a slicker experience.
        ...(isMobile
          ? { redirect: true, callback_url: callbackUrl }
          : {
              handler: async function (response) {
                try {
                  await axios.post(`${API}/bookings/verify-payment`, {
                    booking_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  });
                  toast.success("Booking confirmed ✦", {
                    description: "Check your email for confirmation.",
                  });
                } catch (err) {
                  toast.error("Payment verification failed");
                }
              },
            }),
        modal: {
          ondismiss: () => {
            toast("Payment cancelled. Your slot is reserved for 10 minutes.");
          },
        },
      };

      // Close our Radix dialog FIRST so it stops scroll-locking the body and
      // un-aria-hides siblings — Razorpay's checkout iframe is appended at
      // body root and on mobile Chrome that conflict often makes it unclickable.
      onOpenChange(false);

      // Defer the Razorpay open by one tick so Radix has time to unmount.
      setTimeout(() => {
        try {
          const rzp = new window.Razorpay(options);
          rzp.open();
        } catch (err) {
          toast.error("Could not open payment window");
        }
        setSubmitting(false);
      }, 60);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start booking");
      setSubmitting(false);
    }
  };

  const cur = STEPS[step];

  // Disable past dates, far future, Sundays, and admin-blocked dates
  const disablePast = (d) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const max = new Date();
    max.setMonth(max.getMonth() + 2);
    const dayStr = format(d, "yyyy-MM-dd");
    return (
      d < today ||
      d > max ||
      d.getDay() === 0 ||
      blockedDates.includes(dayStr)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="booking-dialog"
        className="max-w-2xl !bg-[#FFFFFF] border-0 rounded-3xl p-0 overflow-hidden shadow-[0_30px_80px_-20px_rgba(58,46,93,0.6)]"
      >
        {/* Rich lavender header with peach accent */}
        <div className="relative bg-gradient-to-br from-[#6B5B95] via-[#9B8AC4] to-[#6B5B95] px-6 sm:px-8 pt-7 pb-6">
          {/* Decorative peach blur */}
          <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full bg-[#EBB99A]/40 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-10 w-44 h-44 rounded-full bg-[#F4C6D6]/40 blur-3xl pointer-events-none" />

          <DialogHeader className="relative">
            <div className="text-center text-[10px] tracking-[0.32em] uppercase text-[#EBB99A] font-semibold mb-2">
              ✦ Begin Your Journey ✦
            </div>
            <DialogTitle className="font-display text-2xl sm:text-3xl text-white text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
              {stepLabel}
            </DialogTitle>
            <DialogDescription className="text-center text-white/85 text-sm">
              {selectedService
                ? `${selectedService.name} · ₹${selectedService.price_inr.toLocaleString("en-IN")}`
                : "Sacred guidance, one breath at a time"}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 relative">
            <Stepper current={step} steps={STEPS} />
          </div>
        </div>

        <div className="px-6 sm:px-8 py-7 max-h-[60vh] overflow-y-auto bg-[#FFFFFF]">
          {cur === "category" && (
            <div data-testid="step-category" className="grid sm:grid-cols-2 gap-3">
              {categories?.map((c) => {
                const meta = CATEGORY_META[c.id] || CATEGORY_META.tarot_numerology;
                const Icon = meta.icon;
                const minPrice = c.services?.length
                  ? Math.min(...c.services.map((s) => s.price_inr))
                  : 0;
                return (
                  <button
                    key={c.id}
                    data-testid={`pick-category-${c.id}`}
                    onClick={() => {
                      setSelectedCategoryId(c.id);
                      setStep(1);
                    }}
                    className="group text-left rounded-2xl border-2 border-[#EBB99A]/30 hover:border-[#6B5B95] hover:-translate-y-0.5 transition shadow-soft hover:shadow-[0_12px_28px_-8px_rgba(107,91,149,0.3)] overflow-hidden"
                  >
                    <div className={`bg-gradient-to-br ${meta.gradient} px-5 py-4 relative`}>
                      <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/15 blur-2xl pointer-events-none" />
                      <div className="relative flex items-start justify-between gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/30 backdrop-blur flex items-center justify-center text-white">
                          <Icon size={18} strokeWidth={1.6} />
                        </div>
                        <span className="text-[10px] tracking-[0.2em] uppercase bg-white/30 text-white backdrop-blur px-2.5 py-1 rounded-full font-bold">
                          From ₹{minPrice.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="font-display text-base sm:text-lg text-white mt-3 leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
                        {c.name}
                      </div>
                    </div>
                    <div className="bg-white px-5 py-3">
                      <p className="text-xs text-[#3A2E5D]/70 leading-relaxed line-clamp-2">
                        {c.tagline || c.description}
                      </p>
                      <div className="mt-2 text-[10px] tracking-[0.2em] uppercase text-[#9B8AC4] inline-flex items-center gap-1">
                        {c.services?.length || 0} variants <ArrowRight size={11} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {cur === "service" && (
            <div data-testid="step-service" className="grid gap-3">
              {(selectedCategoryId
                ? (services || []).filter((s) => s.category === selectedCategoryId)
                : services
              )?.map((s) => (
                <button
                  key={s.id}
                  data-testid={`pick-service-${s.id}`}
                  onClick={() => {
                    setSelectedService(s);
                    setStep(2);
                  }}
                  className="group text-left rounded-2xl border-2 border-[#EBB99A]/30 bg-gradient-to-r from-[#FBF4E8] to-white px-5 py-4 hover:border-[#6B5B95] hover:shadow-[0_8px_24px_-8px_rgba(107,91,149,0.3)] hover:-translate-y-0.5 transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#C8B6E2] to-[#EBB99A] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(155,138,196,0.3)]">
                      {s.is_voice_note ? <Headphones size={18} /> : <Clock size={18} />}
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-[#D9A382] font-bold">
                        {s.is_voice_note ? "Voice Note · 48 hr delivery" : `${s.duration_minutes} min · Live call`}
                      </div>
                      <div className="font-display text-base text-[#3A2E5D] mt-0.5">
                        {s.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-[#6B5B95] text-2xl">
                      ₹{s.price_inr.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] tracking-wider text-[#9B8AC4] uppercase opacity-0 group-hover:opacity-100 transition">
                      Select →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {cur === "schedule" && (
            <div data-testid="step-schedule" className="grid sm:grid-cols-2 gap-6">
              <div>
                <Label className="text-xs uppercase tracking-[0.22em] text-peach-deep font-semibold">
                  ✦ Pick a date
                </Label>
                <div className="mt-3 rounded-2xl border-2 border-peach/40 bg-[#FBF4E8] p-2">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      setDate(d);
                      setSlot(null);
                    }}
                    disabled={disablePast}
                    className="rounded-2xl bg-[#FBF4E8]"
                    data-testid="booking-calendar"
                  />
                </div>
                <p className="text-xs text-ink-plum/70 mt-2 italic">
                  Sundays are reserved for rest. Slots: 10 AM – 8 PM IST.
                </p>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.22em] text-peach-deep font-semibold">
                  ✦ Available time slots
                </Label>
                <div className="mt-3 grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {!date && (
                    <div className="col-span-2 text-sm text-ink-plum/60 bg-peach/10 rounded-xl p-4 text-center italic">
                      Pick a date to see available slots ✦
                    </div>
                  )}
                  {date && loadingSlots && (
                    <div className="col-span-2 inline-flex items-center gap-2 text-sm text-ink-plum/60">
                      <Loader2 className="animate-spin" size={14} /> Loading…
                    </div>
                  )}
                  {date && !loadingSlots && slots.length === 0 && (
                    <div className="col-span-2 text-sm text-ink-plum/70 bg-peach/15 rounded-xl p-4 text-center">
                      No slots available – please pick another date.
                    </div>
                  )}
                  {slots.map((s) => (
                    <button
                      key={s}
                      data-testid={`slot-${s.replace(/[: ]/g, "-")}`}
                      onClick={() => setSlot(s)}
                      className={`rounded-full px-3 py-2.5 text-sm border-2 transition font-medium ${
                        slot === s
                          ? "bg-gradient-to-r from-[#6B5B95] to-[#9B8AC4] text-white border-[#6B5B95] shadow-[0_4px_14px_rgba(107,91,149,0.45)]"
                          : "bg-white border-[#EBB99A]/40 text-[#3A2E5D] hover:border-[#6B5B95] hover:bg-[#FBF4E8]"
                      }`}
                    >
                      <Clock size={12} className="inline mr-1.5 -mt-0.5" /> {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {cur === "details" && (
            <div data-testid="step-details" className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="customer_name" className="text-ink-plum font-semibold">
                  Full name <span className="text-peach-deep">*</span>
                </Label>
                <Input
                  id="customer_name"
                  data-testid="input-name"
                  placeholder="Your beautiful name"
                  value={form.customer_name}
                  onChange={(e) =>
                    setForm({ ...form, customer_name: e.target.value })
                  }
                  className="mt-2 rounded-xl bg-[#FBF4E8] border-2 border-peach/40 text-ink-plum placeholder:text-ink-plum/40 focus-visible:ring-2 focus-visible:ring-peach focus-visible:border-lavender-deep h-11"
                />
              </div>
              <div>
                <Label htmlFor="customer_email" className="text-ink-plum font-semibold">
                  Email <span className="text-peach-deep">*</span>
                </Label>
                <Input
                  id="customer_email"
                  type="email"
                  data-testid="input-email"
                  placeholder="you@example.com"
                  value={form.customer_email}
                  onChange={(e) =>
                    setForm({ ...form, customer_email: e.target.value })
                  }
                  className="mt-2 rounded-xl bg-[#FBF4E8] border-2 border-peach/40 text-ink-plum placeholder:text-ink-plum/40 focus-visible:ring-2 focus-visible:ring-peach focus-visible:border-lavender-deep h-11"
                />
              </div>
              <div>
                <Label htmlFor="customer_phone" className="text-ink-plum font-semibold">
                  WhatsApp number <span className="text-peach-deep">*</span>
                </Label>
                <Input
                  id="customer_phone"
                  data-testid="input-phone"
                  placeholder="+91 98XXX XXXXX"
                  value={form.customer_phone}
                  onChange={(e) =>
                    setForm({ ...form, customer_phone: e.target.value })
                  }
                  className="mt-2 rounded-xl bg-[#FBF4E8] border-2 border-peach/40 text-ink-plum placeholder:text-ink-plum/40 focus-visible:ring-2 focus-visible:ring-peach focus-visible:border-lavender-deep h-11"
                />
              </div>
              <div>
                <Label htmlFor="birth_date" className="text-ink-plum font-semibold">
                  Birth date
                </Label>
                <Input
                  id="birth_date"
                  type="date"
                  data-testid="input-birth-date"
                  value={form.birth_date}
                  onChange={(e) =>
                    setForm({ ...form, birth_date: e.target.value })
                  }
                  className="mt-2 rounded-xl bg-[#FBF4E8] border-2 border-peach/40 text-ink-plum focus-visible:ring-2 focus-visible:ring-peach focus-visible:border-lavender-deep h-11"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="question" className="text-ink-plum font-semibold">
                  Question / topic for the reading
                </Label>
                <Textarea
                  id="question"
                  data-testid="input-question"
                  placeholder="Share what's on your heart…"
                  rows={3}
                  value={form.question}
                  onChange={(e) =>
                    setForm({ ...form, question: e.target.value })
                  }
                  className="mt-2 rounded-xl bg-[#FBF4E8] border-2 border-peach/40 text-ink-plum placeholder:text-ink-plum/40 focus-visible:ring-2 focus-visible:ring-peach focus-visible:border-lavender-deep"
                />
              </div>
            </div>
          )}

          {cur === "pay" && (
            <div data-testid="step-pay" className="space-y-5">
              <div className="rounded-2xl bg-gradient-to-br from-[#FBF4E8] via-white to-[#F4C6D6]/15 border-2 border-[#EBB99A]/40 p-6 shadow-[0_4px_18px_-4px_rgba(107,91,149,0.15)]">
                <div className="text-[11px] uppercase tracking-[0.32em] text-[#D9A382] font-bold flex items-center gap-2">
                  <Sparkles size={14} className="text-[#EBB99A]" /> Booking Summary
                </div>
                <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/60 rounded-xl px-4 py-3 border border-[#EBB99A]/20">
                    <div className="text-[#9B8AC4] text-[10px] uppercase tracking-[0.2em] font-bold">Service</div>
                    <div className="font-display text-lg text-[#3A2E5D] mt-1">
                      {selectedService?.name}
                    </div>
                  </div>
                  {!isVoiceNote && date && slot && (
                    <div className="bg-white/60 rounded-xl px-4 py-3 border border-[#EBB99A]/20">
                      <div className="text-[#9B8AC4] text-[10px] uppercase tracking-[0.2em] font-bold">Date & time</div>
                      <div className="font-display text-lg text-[#3A2E5D] mt-1">
                        {format(date, "EEE, dd MMM yyyy")} · {slot}
                      </div>
                    </div>
                  )}
                  <div className="bg-white/60 rounded-xl px-4 py-3 border border-[#EBB99A]/20">
                    <div className="text-[#9B8AC4] text-[10px] uppercase tracking-[0.2em] font-bold">For</div>
                    <div className="text-[#3A2E5D] mt-1">
                      {form.customer_name}
                    </div>
                    <div className="text-[#3A2E5D]/70 text-xs">{form.customer_email}</div>
                  </div>
                  <div className="bg-white/60 rounded-xl px-4 py-3 border border-[#EBB99A]/20">
                    <div className="text-[#9B8AC4] text-[10px] uppercase tracking-[0.2em] font-bold">WhatsApp</div>
                    <div className="text-[#3A2E5D] mt-1">{form.customer_phone}</div>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t-2 border-dashed border-[#EBB99A]/40 space-y-3">
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
                      {couponInfo ? "Final amount" : "Total payable"}
                    </div>
                    <div className="font-display text-3xl bg-gradient-to-r from-[#6B5B95] to-[#9B8AC4] bg-clip-text text-transparent">
                      ₹
                      {(couponInfo
                        ? couponInfo.final_inr
                        : selectedService?.price_inr || 0
                      ).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>

              {!couponInfo && (
                <AvailableOffers
                  kind="services"
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
                      data-testid="booking-coupon-input"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 rounded-xl border-2 border-peach/40 bg-[#FBF4E8] px-3 py-2 text-ink-plum placeholder:text-ink-plum/40 focus:border-lavender-deep outline-none uppercase tracking-wider font-mono text-sm"
                    />
                    <button
                      type="button"
                      data-testid="booking-coupon-apply"
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

              <div className="rounded-2xl bg-gradient-to-r from-[#EBB99A]/15 to-[#F4C6D6]/15 border-2 border-[#EBB99A]/30 px-5 py-4 text-sm text-[#3A2E5D]/85 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#EBB99A] to-[#F4C6D6] flex items-center justify-center text-white shrink-0">
                  <Sparkles size={16} />
                </div>
                <div className="leading-relaxed">
                  Secure payment powered by <span className="font-semibold text-[#6B5B95]">Razorpay</span> — UPI, cards, netbanking, wallets. You'll receive WhatsApp + email confirmation immediately after payment.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t-2 border-[#EBB99A]/30 bg-gradient-to-r from-[#FBF4E8] to-[#F5EAD6] px-6 sm:px-8 py-4 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            data-testid="booking-back"
            onClick={goBack}
            disabled={step === 0}
            className="text-[#6B5B95] hover:bg-[#EBB99A]/15 hover:text-[#5A4C7E] disabled:opacity-40 rounded-full"
          >
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>

          {cur === "pay" ? (
            <Button
              data-testid="booking-pay"
              disabled={submitting}
              onClick={handlePay}
              className="bg-gradient-to-r from-[#6B5B95] to-[#9B8AC4] hover:from-[#5A4C7E] hover:to-[#6B5B95] text-white rounded-full px-8 py-2.5 shadow-[0_8px_24px_-8px_rgba(107,91,149,0.6)] font-medium"
            >
              {submitting ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : null}
              Pay ₹
              {(couponInfo
                ? couponInfo.final_inr
                : selectedService?.price_inr || 0
              ).toLocaleString("en-IN")}{" "}
              ✦
            </Button>
          ) : (
            <Button
              data-testid="booking-next"
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
