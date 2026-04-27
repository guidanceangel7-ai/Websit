/**
 * HomePage.jsx — Guidance Angel main page
 *
 * URL structure this page owns:
 *   /                    → homepage (default)
 *   /shop                → homepage, scrolls to shop
 *   /shop/:catId         → homepage, opens category
 *   /product/:productId  → homepage, opens product modal
 *   /book                → open booking dialog (no pre-selected service)
 *   /book/:serviceId     → open booking dialog pre-selected to that service
 *
 * URL is updated silently via pushState so the page never remounts.
 * Browser back button is handled via a popstate listener.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Toaster } from "sonner";
import Header      from "@/components/Header";
import Hero        from "@/components/Hero";
import HeroMarquee from "@/components/HeroMarquee";
import About       from "@/components/About";
import Gallery     from "@/components/Gallery";
import WhyJenika   from "@/components/WhyJenika";
import Services    from "@/components/Services";
import HowItWorks  from "@/components/HowItWorks";
import Shop        from "@/components/Shop";
import Testimonials from "@/components/Testimonials";
import FAQ         from "@/components/FAQ";
import SocialFeed  from "@/components/SocialFeed";
import Contact     from "@/components/Contact";
import Footer      from "@/components/Footer";
import BookingDialog from "@/components/BookingDialog";
import PromoBanner from "@/components/PromoBanner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/** Update the address bar without causing any React re-render or remount. */
function pushUrl(path) {
  try { window.history.pushState(null, "", path); } catch (_) {}
}

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) return [];
  return res.json().catch(() => []);
}

export default function HomePage({ scrollToShop, openBooking }) {
  const { catId, productId, serviceId } = useParams();

  const [bookingOpen, setBookingOpen]       = useState(false);
  const [categories, setCategories]         = useState([]);
  const [services, setServices]             = useState([]);
  const [testimonials, setTestimonials]     = useState([]);
  const [initialService, setInitialService] = useState(null);

  const returnUrlRef = useRef("/");
  const shopRef      = useRef(null);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    apiFetch("/categories").then((r)   => setCategories(Array.isArray(r) ? r : []));
    apiFetch("/services").then((r)     => setServices(Array.isArray(r) ? r : []));
    apiFetch("/testimonials").then((r) => setTestimonials(Array.isArray(r) ? r : []));
  }, []);

  // ── Deep-link: /book/:serviceId ───────────────────────────────────────────
  useEffect(() => {
    if (!serviceId || !services.length) return;
    const svc = services.find((s) => s.id === serviceId);
    if (svc) {
      returnUrlRef.current = "/";
      setInitialService(svc);
      setBookingOpen(true);
    }
  }, [services, serviceId]);

  // ── Deep-link: /book (no serviceId) via prop ──────────────────────────────
  useEffect(() => {
    if (openBooking && !serviceId && services.length) {
      returnUrlRef.current = "/";
      setBookingOpen(true);
      pushUrl("/book");
    }
  }, [openBooking, serviceId, services.length]);

  // ── Scroll to #shop for /shop/* and /product/* routes ────────────────────
  useEffect(() => {
    if (!scrollToShop) return;
    const el = shopRef.current || document.getElementById("shop");
    if (!el) return;
    const t = setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 350);
    return () => clearTimeout(t);
  }, [scrollToShop]);

  // ── Popstate: browser back button ────────────────────────────────────────
  useEffect(() => {
    function handlePop() {
      if (!window.location.pathname.startsWith("/book")) {
        setBookingOpen(false);
        setInitialService(null);
      }
    }
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  // ── Open booking dialog ───────────────────────────────────────────────────
  const openBookingDialog = useCallback((svc = null) => {
    returnUrlRef.current = window.location.pathname + window.location.search;
    setInitialService(svc || null);
    setBookingOpen(true);
    pushUrl(svc ? `/book/${svc.id}` : "/book");
  }, []);

  const handleServiceSelected = useCallback((svcId) => {
    pushUrl(`/book/${svcId}`);
  }, []);

  const handleBookingClose = useCallback((open) => {
    if (!open) {
      setBookingOpen(false);
      setInitialService(null);
      pushUrl(returnUrlRef.current || "/");
    } else {
      setBookingOpen(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#FBF4E8]">
      <Toaster position="top-center" richColors />
      <PromoBanner />
      <Header onBookNow={() => openBookingDialog()} />

      <main>
        <Hero        onBookNow={() => openBookingDialog()} />
        <HeroMarquee />
        <About />
        <Gallery />

        {/* Why Jenika — 6 reasons / feature cards */}
        <WhyJenika />

        {/* Services — bookable offerings with real category data (id="services" for nav) */}
        <Services categories={categories} onBookNow={openBookingDialog} />

        {/* How it works — the booking process steps */}
        <HowItWorks />

        {/* Shop — crystals, oils, products */}
        <div ref={shopRef}>
          <Shop
            initialCategoryId={catId || null}
            initialProductId={productId || null}
            onBookNow={openBookingDialog}
          />
        </div>

        {/* Testimonials — double-row marquee */}
        <Testimonials items={testimonials} />

        <FAQ />
        <SocialFeed />
        <Contact onBookNow={() => openBookingDialog()} />
      </main>

      <Footer />

      <BookingDialog
        open={bookingOpen}
        onOpenChange={handleBookingClose}
        categories={categories}
        services={services}
        initialService={initialService}
        onServiceSelected={handleServiceSelected}
      />
    </div>
  );
}
