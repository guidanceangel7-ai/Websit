import React from "react";
import { motion } from "framer-motion";
import { CalendarCheck, CreditCard, Video, MessageCircle } from "lucide-react";
import { Overline, StarDivider } from "./Decor";

const STEPS = [
  {
    icon: CalendarCheck,
    title: "Book your session",
    desc: "Choose your service — call, voice note or healing program — and pick a date that works for you.",
    color: "from-[#6B5B95] to-[#9B8AC4]",
  },
  {
    icon: CreditCard,
    title: "Confirm & pay",
    desc: "Secure payment via Razorpay. You'll receive a confirmation email instantly after checkout.",
    color: "from-[#9B8AC4] to-[#C8B6E2]",
  },
  {
    icon: Video,
    title: "Attend your reading",
    desc: "Join via Google Meet or Zoom for live sessions. Voice note readings are delivered within 48 hours.",
    color: "from-[#EBB99A] to-[#F4C6D6]",
  },
  {
    icon: MessageCircle,
    title: "Receive guidance",
    desc: "Walk away with clarity, direction, and actionable insights to step into your highest potential.",
    color: "from-[#F4C6D6] to-[#FBE4D5]",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      data-testid="how-it-works-section"
      className="relative py-20 sm:py-28 bg-gradient-to-b from-ivory to-ivory-deep/30"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12">
        <div className="text-center max-w-2xl mx-auto">
          <Overline>Simple Steps</Overline>
          <h2
            data-testid="how-it-works-heading"
            className="font-display mt-4 text-4xl sm:text-5xl text-ink-plum leading-[1.08] tracking-tight"
          >
            How a reading{" "}
            <span className="italic text-lavender-deep">works</span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-ink-plum/70 leading-relaxed">
            From booking to breakthrough — here's what to expect when you choose
            to work with Jenika.
          </p>
        </div>

        <StarDivider className="mt-12 mb-14" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative bg-white/80 backdrop-blur border border-peach/30 rounded-3xl p-6 shadow-sm group hover:shadow-md transition-shadow"
            >
              {/* Step number */}
              <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-[#3A2E5D] text-ivory text-xs font-bold flex items-center justify-center shadow-md">
                {i + 1}
              </div>

              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 shadow-md`}
              >
                <step.icon size={22} className="text-white" />
              </div>

              <h3 className="font-display text-lg text-ink-plum leading-tight">
                {step.title}
              </h3>
              <p className="mt-2.5 text-sm text-ink-plum/70 leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
