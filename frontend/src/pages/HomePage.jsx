import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Hero from "../components/Hero";
import About from "../components/About";
import Gallery from "../components/Gallery";
import Services from "../components/Services";
import Testimonials from "../components/Testimonials";
import FAQ from "../components/FAQ";
import Contact from "../components/Contact";
import Footer from "../components/Footer";
import BookingDialog from "../components/BookingDialog";
import { Toaster } from "../components/ui/sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function HomePage() {
  const [services, setServices] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [initialService, setInitialService] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, t] = await Promise.all([
          axios.get(`${API}/services`),
          axios.get(`${API}/testimonials`),
        ]);
        if (!alive) return;
        setServices(s.data || []);
        setTestimonials(t.data || []);
      } catch (e) {
        // graceful – page still renders
        console.error(e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const openBooking = (service = null) => {
    setInitialService(service);
    setBookingOpen(true);
  };

  return (
    <div className="min-h-screen bg-ivory text-ink-plum font-body">
      <Header onBookNow={() => openBooking(null)} />
      <main>
        <Hero onBookNow={() => openBooking(null)} />
        <About />
        <Gallery />
        <Services
          services={services}
          onSelect={(s) => openBooking(s)}
        />
        <Testimonials items={testimonials} />
        <FAQ />
        <Contact onBookNow={() => openBooking(null)} />
      </main>
      <Footer />
      <BookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        initialService={initialService}
        services={services}
      />
      <Toaster richColors position="top-center" />
    </div>
  );
}
