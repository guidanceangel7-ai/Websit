# Guidance Angel — Product Requirements Document

## Original Problem Statement
> Create a landing page/website for my services - my current websites are
> https://www.guidanceangel7.com, https://guidanceangel7.exlyapp.com.
> Use the data from them and create a wonderful landing page.

## User Choices Captured (2026-04-25)
- **Functionality**: Full booking system on the website with calendar + payment
- **Aesthetic**: User-supplied brand board (Lavender + Peach Gold, Lora + Poppins,
  warm-ivory ethereal/angelic vibe)
- **Pricing**: Show all services from existing site with prices
- **Booking action**: Full in-website calendar → details → payment flow
- **Sections**: Include everything (testimonials, FAQ, social proof, contact)
- **Payment**: Razorpay (test-mode placeholder; mock fallback active until live keys added)

## User Personas
- **Primary**: Spiritual seekers (women 22–55) looking for tarot/numerology/Akashic
  guidance. Mobile-first (Instagram-driven traffic).
- **Secondary**: Existing clients re-booking sessions.
- **Admin**: Jenika Bhayani — needs a simple sanctum to view bookings.

## Architecture
- Frontend: React 19 + Tailwind + shadcn/ui + framer-motion + react-fast-marquee
- Backend: FastAPI + Motor (MongoDB) + razorpay SDK
- Payment: Razorpay (currently mock fallback when key starts with `rzp_test_PLACEHOLDER`)
- Auth: Simple username/password admin login → JWT (HS256) with 1 admin user from env

## What's Been Implemented (2026-04-25)
- Beautiful brand-aligned landing page (header, hero w/ floating sparkles & logo medallion, about, services grid, testimonials marquee, FAQ accordion, contact card, footer)
- Public APIs: `GET /api/services`, `GET /api/testimonials`, `GET /api/slots/{date}`
- Booking APIs: `POST /api/bookings/create-order`, `POST /api/bookings/verify-payment`
- Admin APIs: `POST /api/admin/login`, `GET /api/admin/bookings`, `GET /api/admin/stats`
- Multi-step booking dialog (Service → Date+Slot → Details → Pay) with Voice-Note 3-step variant
- Razorpay live integration ready (drop in real key in `.env` to disable mock)
- Admin dashboard with stats cards + bookings table at `/admin` (login at `/admin/login`)
- Seed data: 9 services (Tarot/Numerology 15/30/45 min, Akashic 30/45/60 min, 3 Voice Notes), 8 testimonials
- Slot generation: 10 AM – 7 PM IST, 30-min increments, Sundays closed, paid bookings block slots
- All tests pass: 15/15 backend pytest + 100% frontend critical flows

## Prioritised Backlog
### P0 (Production blockers)
- Replace `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` placeholders with real keys
- Configure Razorpay webhook (`/api/webhook` route — to be added) for resilient confirmation
- Send booking confirmation email + WhatsApp template message (Twilio / WATI)

### P1 (Strongly recommended)
- Admin: per-booking notes, status edit (mark completed / no-show)
- Admin: export CSV
- Block-out dates for vacations / personal days
- Time-zone awareness in slots (current is server time; assume IST)

### P2 (Polish / growth)
- Razorpay Magic Checkout for higher conversion
- Gift-a-reading flow (purchaser ≠ recipient)
- Yearly horoscope blog with rich SEO

## Next Tasks
1. Plug live Razorpay keys in `/app/backend/.env` and `/app/frontend/.env`
2. Add WhatsApp/email confirmation sender
3. Add Razorpay webhook route for signed reconciliation
