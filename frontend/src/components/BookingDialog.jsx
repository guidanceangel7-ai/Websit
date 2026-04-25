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
  Check,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import { BRAND } from "../lib/brand";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const RAZORPAY_KEY_ID =
  process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_test_PLACEHOLDER";

const STEPS_LIVE = ["service", "schedule", "details", "pay"];
const STEPS_VOICE = ["service", "details", "pay"];

function Stepper({ current, steps }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition ${
              i < current
                ? "bg-lavender-deep text-ivory"
                : i === current
                  ? "bg-peach text-ink-plum ring-4 ring-peach/30"
                  : "bg-ivory-deep text-ink-plum/50"
            }`}
          >
            {i < current ? <Check size={14} /> : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-px w-8 sm:w-12 ${i < current ? "bg-lavender-deep" : "bg-peach/40"}`}
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
  services,
}) {
  const [selectedService, setSelectedService] = useState(initialService || null);
  const isVoiceNote = !!selectedService?.is_voice_note;
  const STEPS = isVoiceNote ? STEPS_VOICE : STEPS_LIVE;

  const [step, setStep] = useState(0);
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      setStep(initialService ? (initialService.is_voice_note ? 0 : 0) : 0);
      // If a service is preselected, jump to next step
      if (initialService) setStep(1);
      setDate(null);
      setSlot(null);
      setSlots([]);
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
  }, [open, initialService]);

  // When service selection changes, reset to step 0 if needed
  useEffect(() => {
    if (selectedService && step === 0) setStep(1);
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
    return {
      service: "Choose a Service",
      schedule: "Pick a Date & Time",
      details: "Your Details",
      pay: "Confirm & Pay",
    }[cur];
  }, [step, STEPS]);

  const canNext = useMemo(() => {
    const cur = STEPS[step];
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
  }, [step, STEPS, selectedService, date, slot, form]);

  const goNext = () => {
    if (!canNext) return;
    if (step < STEPS.length - 1) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 0) setStep(step - 1);
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
        handler: async function (response) {
          try {
            await axios.post(`${API}/bookings/verify-payment`, {
              booking_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success("Booking confirmed ✦", {
              description: "Check your email/WhatsApp for confirmation.",
            });
            onOpenChange(false);
          } catch (err) {
            toast.error("Payment verification failed");
          }
        },
        modal: {
          ondismiss: () => {
            toast("Payment cancelled. Your slot is reserved for 10 minutes.");
          },
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start booking");
    } finally {
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
        className="max-w-2xl bg-ivory border-peach/40 rounded-3xl p-0 overflow-hidden"
      >
        <div className="bg-gradient-to-br from-lavender-soft/60 to-blush/40 px-6 sm:px-8 py-6 border-b border-peach/30">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-ink-plum text-center">
              {stepLabel}
            </DialogTitle>
            <DialogDescription className="text-center text-ink-plum/60 text-sm">
              {selectedService
                ? `${selectedService.name} · ₹${selectedService.price_inr.toLocaleString("en-IN")}`
                : "Begin your guidance journey"}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Stepper current={step} steps={STEPS} />
          </div>
        </div>

        <div className="px-6 sm:px-8 py-6 max-h-[60vh] overflow-y-auto">
          {cur === "service" && (
            <div data-testid="step-service" className="grid gap-3">
              {services?.map((s) => (
                <button
                  key={s.id}
                  data-testid={`pick-service-${s.id}`}
                  onClick={() => {
                    setSelectedService(s);
                    setStep(1);
                  }}
                  className="text-left rounded-2xl border border-peach/30 bg-white px-5 py-4 hover:border-lavender-deep hover:shadow-soft transition flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-peach-deep">
                      {s.is_voice_note
                        ? "Voice Note"
                        : `${s.duration_minutes} min`}
                    </div>
                    <div className="font-display text-base text-ink-plum mt-1">
                      {s.name}
                    </div>
                  </div>
                  <div className="font-display text-lavender-deep text-xl">
                    ₹{s.price_inr.toLocaleString("en-IN")}
                  </div>
                </button>
              ))}
            </div>
          )}

          {cur === "schedule" && (
            <div data-testid="step-schedule" className="grid sm:grid-cols-2 gap-6">
              <div>
                <Label className="text-xs uppercase tracking-[0.22em] text-peach-deep">
                  Pick a date
                </Label>
                <div className="mt-3 rounded-2xl border border-peach/30 bg-white p-2">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      setDate(d);
                      setSlot(null);
                    }}
                    disabled={disablePast}
                    className="rounded-2xl"
                    data-testid="booking-calendar"
                  />
                </div>
                <p className="text-xs text-ink-plum/60 mt-2">
                  Sundays are reserved for rest. Slots: 10 AM – 8 PM IST.
                </p>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.22em] text-peach-deep">
                  Available time slots
                </Label>
                <div className="mt-3 grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {!date && (
                    <div className="col-span-2 text-sm text-ink-plum/60">
                      Pick a date to see slots.
                    </div>
                  )}
                  {date && loadingSlots && (
                    <div className="col-span-2 inline-flex items-center gap-2 text-sm text-ink-plum/60">
                      <Loader2 className="animate-spin" size={14} /> Loading…
                    </div>
                  )}
                  {date && !loadingSlots && slots.length === 0 && (
                    <div className="col-span-2 text-sm text-ink-plum/60">
                      No slots available – please pick another date.
                    </div>
                  )}
                  {slots.map((s) => (
                    <button
                      key={s}
                      data-testid={`slot-${s.replace(/[: ]/g, "-")}`}
                      onClick={() => setSlot(s)}
                      className={`rounded-full px-3 py-2 text-sm border transition ${
                        slot === s
                          ? "bg-lavender-deep text-ivory border-lavender-deep"
                          : "bg-white border-peach/40 text-ink-plum hover:border-lavender-deep"
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
                <Label htmlFor="customer_name">Full name *</Label>
                <Input
                  id="customer_name"
                  data-testid="input-name"
                  value={form.customer_name}
                  onChange={(e) =>
                    setForm({ ...form, customer_name: e.target.value })
                  }
                  className="mt-2 rounded-xl bg-white border-peach/30 focus-visible:ring-peach"
                />
              </div>
              <div>
                <Label htmlFor="customer_email">Email *</Label>
                <Input
                  id="customer_email"
                  type="email"
                  data-testid="input-email"
                  value={form.customer_email}
                  onChange={(e) =>
                    setForm({ ...form, customer_email: e.target.value })
                  }
                  className="mt-2 rounded-xl bg-white border-peach/30 focus-visible:ring-peach"
                />
              </div>
              <div>
                <Label htmlFor="customer_phone">WhatsApp number *</Label>
                <Input
                  id="customer_phone"
                  data-testid="input-phone"
                  placeholder="+91…"
                  value={form.customer_phone}
                  onChange={(e) =>
                    setForm({ ...form, customer_phone: e.target.value })
                  }
                  className="mt-2 rounded-xl bg-white border-peach/30 focus-visible:ring-peach"
                />
              </div>
              <div>
                <Label htmlFor="birth_date">Birth date</Label>
                <Input
                  id="birth_date"
                  type="date"
                  data-testid="input-birth-date"
                  value={form.birth_date}
                  onChange={(e) =>
                    setForm({ ...form, birth_date: e.target.value })
                  }
                  className="mt-2 rounded-xl bg-white border-peach/30 focus-visible:ring-peach"
                />
              </div>
              <div>
                <Label htmlFor="birth_time">Birth time</Label>
                <Input
                  id="birth_time"
                  type="time"
                  data-testid="input-birth-time"
                  value={form.birth_time}
                  onChange={(e) =>
                    setForm({ ...form, birth_time: e.target.value })
                  }
                  className="mt-2 rounded-xl bg-white border-peach/30 focus-visible:ring-peach"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="birth_place">Birth place</Label>
                <Input
                  id="birth_place"
                  data-testid="input-birth-place"
                  placeholder="City, Country"
                  value={form.birth_place}
                  onChange={(e) =>
                    setForm({ ...form, birth_place: e.target.value })
                  }
                  className="mt-2 rounded-xl bg-white border-peach/30 focus-visible:ring-peach"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="question">
                  Question / topic for the reading
                </Label>
                <Textarea
                  id="question"
                  data-testid="input-question"
                  rows={3}
                  value={form.question}
                  onChange={(e) =>
                    setForm({ ...form, question: e.target.value })
                  }
                  className="mt-2 rounded-xl bg-white border-peach/30 focus-visible:ring-peach"
                />
              </div>
            </div>
          )}

          {cur === "pay" && (
            <div data-testid="step-pay" className="space-y-5">
              <div className="rounded-2xl bg-white border border-peach/30 p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-peach-deep">
                  Booking Summary
                </div>
                <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-ink-plum/60">Service</div>
                    <div className="font-display text-lg text-ink-plum">
                      {selectedService?.name}
                    </div>
                  </div>
                  {!isVoiceNote && date && slot && (
                    <div>
                      <div className="text-ink-plum/60">Date & time</div>
                      <div className="font-display text-lg text-ink-plum">
                        {format(date, "EEE, dd MMM yyyy")} · {slot}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-ink-plum/60">For</div>
                    <div className="text-ink-plum">
                      {form.customer_name} ({form.customer_email})
                    </div>
                  </div>
                  <div>
                    <div className="text-ink-plum/60">WhatsApp</div>
                    <div className="text-ink-plum">{form.customer_phone}</div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-peach/20 flex items-center justify-between">
                  <div className="text-sm text-ink-plum/70">Total payable</div>
                  <div className="font-display text-2xl text-lavender-deep">
                    ₹{selectedService?.price_inr?.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-peach/15 border border-peach/40 px-5 py-4 text-sm text-ink-plum/80 flex items-start gap-3">
                <Sparkles size={16} className="text-peach-deep mt-0.5" />
                <div>
                  Secure payment powered by Razorpay (UPI, cards, netbanking,
                  wallets). You'll receive a WhatsApp confirmation immediately
                  after payment.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-peach/30 bg-ivory px-6 sm:px-8 py-4 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            data-testid="booking-back"
            onClick={goBack}
            disabled={step === 0}
            className="text-ink-plum/70 hover:text-lavender-deep"
          >
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>

          {cur === "pay" ? (
            <Button
              data-testid="booking-pay"
              disabled={submitting}
              onClick={handlePay}
              className="bg-lavender-deep hover:bg-lavender-deeper text-ivory rounded-full px-7"
            >
              {submitting ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : null}
              Pay ₹{selectedService?.price_inr?.toLocaleString("en-IN")}
            </Button>
          ) : (
            <Button
              data-testid="booking-next"
              disabled={!canNext}
              onClick={goNext}
              className="bg-lavender-deep hover:bg-lavender-deeper text-ivory rounded-full px-7"
            >
              Continue <ArrowRight size={16} className="ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
