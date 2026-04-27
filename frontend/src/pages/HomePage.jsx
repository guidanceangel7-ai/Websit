/**
 * HomePage.jsx — Guidance Angel main page
 * Handles deep links for shop categories, product modals, and booking dialog.
 *
 * URL params used:
 *   /shop/:catId        → auto-opens that shop category
 *   /product/:productId → auto-opens that product's detail popup
 *   /book/:serviceId    → auto-opens booking dialog pre-selected to that service
 */
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Toaster } from "sonner";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HeroMarquee from "@/components/HeroMarquee";
import About from "@/components/About";
import Gallery from "@/components/Gallery";
import HowItWorks from "@/components/HowItWorks";
import Shop from "@/components/Shop";
import Footer from "@/components/Footer";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import BookingDialog from "@/components/BookingDialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) return [];
  return res.json().catch(() => []);
}

export default function HomePage({ scrollToShop, openBooking }) {
  const { catId, productId, serviceId } = useParams();

  const [bookingOpen, setBookingOpen]     = useState(false);
  const [categories, setCategories]       = useState([]);
  const [services, setServices]           = useState([]);
  const [initialService, setInitialService] = useState(null);

  const shopRef = useRef(null);

  // Load booking categories + services
  useEffect(() => {
    apiFetch("/categories").then((r) => setCategories(Array.isArray(r) ? r : []));
    apiFetch("/services").then((r) => setServices(Array.isArray(r) ? r : []));
  }, []);

  // When services are loaded and we have a serviceId from the URL → auto-open booking
  useEffect(() => {
    if (!serviceId || !services.length) return;
    const svc = services.find((s) => s.id === serviceId);
    if (svc) {
      setInitialService(svc);
      setBookingOpen(true);
    }
  }, [services, serviceId]);

  // For /book without serviceId
  useEffect(() => {
    if (openBooking && !serviceId) setBookingOpen(true);
  }, [openBooking, serviceId]);

  // Scroll to shop section when the route is /shop or /shop/:catId or /product/:productId
  useEffect(() => {
    if (!scrollToShop) return;
    const el = shopRef.current || document.getElementById("shop");
    if (!el) return;
    // Small delay so the page renders first
    const t = setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 350);
    return () => clearTimeout(t);
  }, [scrollToShop]);

  return (
    <div className="min-h-screen bg-[#FBF4E8]">
      <Toaster position="top-center" richColors />
      <Header onBookNow={() => setBookingOpen(true)} />
      <main>
        <Hero onBookNow={() => setBookingOpen(true)} />
        <HeroMarquee />
        <About />
        <Gallery />
        <HowItWorks />
        {/* Shop — receives deep-link initial state from URL params */}
        <div ref={shopRef}>
          <Shop
            initialCategoryId={catId || null}
            initialProductId={productId || null}
          />
        </div>
        <FAQ />
        <Contact onBookNow={() => setBookingOpen(true)} />
      </main>
      <Footer />

      <BookingDialog
        open={bookingOpen}
        onOpenChange={(v) => {
          setBookingOpen(v);
          if (!v) setInitialService(null);
        }}
        categories={categories}
        services={services}
        initialService={initialService}
      />
    </div>
  );
}
