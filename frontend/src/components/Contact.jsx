import React from "react";
import { Mail, Phone, MessageCircle, Instagram, MapPin } from "lucide-react";
import { BRAND } from "../lib/brand";
import { Overline } from "./Decor";

export default function Contact({ onBookNow }) {
  return (
    <section
      id="contact"
      data-testid="contact-section"
      className="relative py-20 sm:py-28"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12">
        <div className="rounded-[2.5rem] overflow-hidden relative bg-gradient-to-br from-lavender-deep via-lavender-dusty to-lavender-deep">
          <div
            aria-hidden="true"
            className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-peach/30 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-blush/40 blur-3xl"
          />

          <div className="relative grid lg:grid-cols-2 gap-12 p-10 sm:p-14 lg:p-20">
            <div className="text-ivory">
              <Overline className="text-peach">Stay Connected</Overline>
              <h2 className="font-display mt-4 text-4xl sm:text-5xl leading-[1.08] tracking-tight">
                Ready to begin your{" "}
                <span className="italic text-peach">soul journey?</span>
              </h2>
              <p className="mt-6 text-ivory/85 max-w-md leading-relaxed">
                Book online or simply send a message – Jenika usually replies
                within a few hours, with the warmth of a sister.
              </p>

              <button
                data-testid="contact-book-now"
                onClick={onBookNow}
                className="mt-8 inline-flex items-center gap-2 bg-ivory text-lavender-deep rounded-full px-7 py-3.5 text-sm font-medium hover:bg-peach hover:text-ink-plum transition"
              >
                Book a Reading
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  icon: MessageCircle,
                  label: "WhatsApp",
                  value: BRAND.whatsappPretty,
                  href: `https://wa.me/${BRAND.whatsapp}`,
                  testid: "contact-whatsapp",
                },
                {
                  icon: Phone,
                  label: "Call",
                  value: BRAND.whatsappPretty,
                  href: `tel:${BRAND.phone}`,
                  testid: "contact-phone",
                },
                {
                  icon: Mail,
                  label: "Email",
                  value: BRAND.email,
                  href: `mailto:${BRAND.email}`,
                  testid: "contact-email",
                },
                {
                  icon: Instagram,
                  label: "Instagram",
                  value: "@guidance_angel7",
                  href: BRAND.instagram,
                  testid: "contact-instagram",
                },
                {
                  icon: MapPin,
                  label: "Based in",
                  value: "Gujarat, India",
                  href: null,
                  testid: "contact-location",
                },
              ].map((item) => {
                const Comp = item.href ? "a" : "div";
                return (
                  <Comp
                    key={item.label}
                    href={item.href || undefined}
                    target={item.href ? "_blank" : undefined}
                    rel={item.href ? "noreferrer" : undefined}
                    data-testid={item.testid}
                    className="block rounded-2xl bg-ivory/10 backdrop-blur border border-ivory/20 px-5 py-5 hover:bg-ivory/20 transition"
                  >
                    <div className="flex items-center gap-3 text-peach">
                      <item.icon size={16} />
                      <span className="text-[10px] tracking-[0.22em] uppercase">
                        {item.label}
                      </span>
                    </div>
                    <div className="mt-2 text-ivory font-display text-base sm:text-lg break-all">
                      {item.value}
                    </div>
                  </Comp>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
