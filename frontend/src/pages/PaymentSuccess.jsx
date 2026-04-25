import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Razorpay redirects here with query params after a payment attempt.
 *   ?razorpay_order_id=...&razorpay_payment_id=...&razorpay_signature=...
 *   &kind=booking|order&id=<booking_id|order_id>
 *
 * The page calls the matching verify-payment endpoint and shows a confirmation.
 */
export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, ok: false, message: "" });

  useEffect(() => {
    const kind = params.get("kind") || "booking";
    const localId = params.get("id");
    const rzpOrderId = params.get("razorpay_order_id");
    const rzpPaymentId = params.get("razorpay_payment_id");
    const rzpSignature = params.get("razorpay_signature");

    if (!localId || !rzpOrderId || !rzpPaymentId) {
      setState({
        loading: false,
        ok: false,
        message:
          "We couldn't read the payment details from the URL. If money was deducted, please contact us — we'll resolve it within minutes.",
      });
      return;
    }

    const endpoint =
      kind === "order" ? "/orders/verify-payment" : "/bookings/verify-payment";
    const body =
      kind === "order"
        ? {
            order_id: localId,
            razorpay_order_id: rzpOrderId,
            razorpay_payment_id: rzpPaymentId,
            razorpay_signature: rzpSignature,
          }
        : {
            booking_id: localId,
            razorpay_order_id: rzpOrderId,
            razorpay_payment_id: rzpPaymentId,
            razorpay_signature: rzpSignature,
          };

    axios
      .post(`${API}${endpoint}`, body)
      .then(() => {
        setState({
          loading: false,
          ok: true,
          message:
            kind === "order"
              ? "Your sacred-shop order is confirmed. A confirmation email is on its way ✦"
              : "Your booking is confirmed. A confirmation email is on its way ✦",
        });
      })
      .catch((e) => {
        setState({
          loading: false,
          ok: false,
          message:
            e?.response?.data?.detail ||
            "We received your payment but couldn't auto-confirm the booking. Please WhatsApp us — we'll reconcile it within minutes.",
        });
      });
  }, [params]);

  return (
    <div className="min-h-screen bg-ivory text-ink-plum font-body flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg rounded-3xl bg-white border border-peach/30 shadow-[0_20px_50px_-15px_rgba(58,46,93,0.25)] p-8 sm:p-10 text-center">
        {state.loading ? (
          <>
            <Loader2
              className="animate-spin mx-auto text-lavender-deep mb-4"
              size={36}
            />
            <div className="text-[10px] tracking-[0.32em] uppercase text-peach-deep font-bold">
              ✦ Confirming
            </div>
            <h1 className="font-display text-3xl sm:text-4xl mt-2 leading-tight">
              Sealing your booking
            </h1>
            <p className="text-sm text-ink-plum/60 mt-3">
              Please don't close this tab. This usually takes a few seconds.
            </p>
          </>
        ) : state.ok ? (
          <>
            <CheckCircle2
              className="mx-auto text-lavender-deep mb-4"
              size={48}
            />
            <div className="text-[10px] tracking-[0.32em] uppercase text-peach-deep font-bold">
              ✦ Confirmed
            </div>
            <h1 className="font-display text-3xl sm:text-4xl mt-2 leading-tight">
              Thank you, beautiful soul
            </h1>
            <p className="text-sm text-ink-plum/70 mt-3 leading-relaxed">
              {state.message}
            </p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-lavender-deep text-ivory px-5 py-2.5 text-sm hover:bg-lavender-deeper"
            >
              Return home <ArrowRight size={14} />
            </button>
          </>
        ) : (
          <>
            <XCircle className="mx-auto text-rose-500 mb-4" size={48} />
            <div className="text-[10px] tracking-[0.32em] uppercase text-rose-500 font-bold">
              ✦ Needs attention
            </div>
            <h1 className="font-display text-3xl sm:text-4xl mt-2 leading-tight">
              Couldn't auto-confirm
            </h1>
            <p className="text-sm text-ink-plum/70 mt-3 leading-relaxed">
              {state.message}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <a
                href="https://wa.me/918849023100"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] text-white px-5 py-2.5 text-sm hover:bg-[#1ebe5b]"
              >
                WhatsApp us
              </a>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-2 rounded-full border border-peach/40 bg-white px-5 py-2.5 text-sm hover:bg-peach/10"
              >
                Return home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
