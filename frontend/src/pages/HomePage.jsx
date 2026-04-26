import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Hero from "../components/Hero";
import HeroMarquee from "../components/HeroMarquee";
import PressStrip from "../components/PressStrip";
import About from "../components/About";
import Gallery from "../components/Gallery";
import WhyJenika from "../components/WhyJenika";
import HowItWorks from "../components/HowItWorks";
import Services from "../components/Services";
import Shop from "../components/Shop";
import Testimonials from "../components/Testimonials";
import InstagramGrid from "../components/InstagramGrid";
import YouTubeGrid from "../components/YouTubeGrid"; // ✅ ADDED
import FAQ from "../components/FAQ";
import Contact from "../components/Contact";
import Footer from "../components/Footer";
import BookingDialog from "../components/BookingDialog";
import SpecialOfferBanner from "../components/SpecialOfferBanner";
import { Toaster } from "../components/ui/sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [initialService, setInitialService] = useState(null);
  const [initialCategoryId, setInitialCategoryId] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, t] = await Promise.all([
          axios.get(`${API}/categories`),
          axios.get(`${API}/testimonials`),
        ]);
        if (!alive) return;
        const cats = c.data || [];
        setCategories(cats);

        const flat = cats.flatMap((cat) => cat.services || []);
        setServices(flat);
        setTestimonials(t.data || []);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const openBooking = (service = null, categoryId = null) => {
    setInitialService(service);
    setInitialCategoryId(categoryId || (service ? service.category : null));
    setBookingOpen(true);
  };

  return (
    <div className="min-h-screen bg-ivory text-ink-plum font-body">
      <SpecialOfferBanner />
      <Header onBookNow={() => openBooking(null, null)} />

      <main style={{ paddingTop: "var(--banner-h, 0px)" }}>
        <Hero onBookNow={() => openBooking(null, null)} />
        <HeroMarquee />
        <PressStrip />
        <About />
        <Gallery />
        <WhyJenika />
        <HowItWorks onBookNow={() => openBooking(null, null)} />

        <Services
          categories={categories}
          onSelect={(s) => openBooking(s)}
        />

        <Shop />
        <Testimonials items={testimonials} />

        {/* ✅ SOCIAL SECTION */}
        <InstagramGrid />
        <YouTubeGrid /> {/* ⭐ THIS WAS MISSING */}

        <FAQ />
        <Contact onBookNow={() => openBooking(null, null)} />
      </main>

      <Footer />

      <BookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        initialService={initialService}
        initialCategoryId={initialCategoryId}
        categories={categories}
        services={services}
      />

      <Toaster richColors position="top-center" />
    </div>
  );
}
