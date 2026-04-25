# Guidance Angel — Product Requirements Document

## Original Problem Statement
> Create a landing page/website for my services - my current websites are
> https://www.guidanceangel7.com, https://guidanceangel7.exlyapp.com.
> Use the data from them and create a wonderful landing page.

## User Choices Captured
- **Functionality**: Full booking system on the website with calendar + payment
- **Aesthetic**: User-supplied brand board (Lavender + Peach Gold, Lora + Poppins,
  warm-ivory ethereal/angelic vibe)
- **Pricing**: Show all services from existing site with prices
- **Booking action**: Full in-website calendar → details → payment flow
- **Sections**: Include everything (testimonials, FAQ, social proof, contact)
- **Payment**: Razorpay (test-mode placeholder; mock fallback active until live keys added)
- **Shop**: Native end-to-end shop with checkout (no Wix redirect)
- **Promotions**: Coupon system with site-wide banner
- **Shop Categories**: Group products into collections (e.g. Candles → Money / Love / Protection)

## User Personas
- **Primary**: Spiritual seekers (women 22–55) looking for tarot/numerology/Akashic
  guidance. Mobile-first (Instagram-driven traffic).
- **Secondary**: Existing clients re-booking sessions or buying products.
- **Admin**: Jenika Bhayani — needs a sanctum to manage all content end-to-end.

## Architecture
- Frontend: React 19 + Tailwind + shadcn/ui + framer-motion + react-fast-marquee
- Backend: FastAPI + Motor (MongoDB) + razorpay SDK
- Payment: Razorpay (currently mock fallback when key starts with `rzp_test_PLACEHOLDER`)
- Email: Resend (configured)
- WhatsApp: Meta Cloud API service file ready (awaiting keys)
- Auth: Simple username/password admin login → JWT (HS256) with 1 admin user from env

## What's Been Implemented
- Brand-aligned landing page (header, hero, about, services, shop, testimonials, FAQ, contact)
- Multi-step Booking dialog (Service → Date+Slot → Details → Pay) with Voice-Note 3-step variant
- Native Shop with cart-based checkout dialog (replacing Wix redirect)
- Promotions / Coupons system with auto-banner on website
- Shop product categories (group variants like Candles → Money / Love / Protection)
- Full Admin Dashboard with 9 functional tabs:
  - Bookings, Schedule, Services, Service Categories, **Shop**, **Shop Categories** (new),
    Orders, Promotions, Testimonials
- Image upload (base64) for shop products
- Slot generation: 10 AM – 7 PM IST, 30-min increments, Sundays closed,
  paid+pending bookings block slots
- Email confirmation (Resend) for bookings & orders
- All endpoints prefixed `/api`, MongoDB queries always exclude `_id`

## Active Integrations
- **Resend** (email confirmations) — KEY in `.env` ✅
- **Razorpay** (payments) — KEY placeholder, mock fallback active ⚠️
- **Meta WhatsApp Cloud API** — service file present, awaiting keys ⚠️

## Prioritised Backlog

### P0 (Production blockers)
- Replace `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` placeholders with real keys
- Configure Razorpay webhook (`/api/webhook` route) for resilient confirmation

### P1 (Strongly recommended)
- Activate WhatsApp auto-confirmation via Meta Cloud API
- Admin: CSV export of bookings & orders
- Admin: per-booking notes
- Time-zone awareness in slots (currently server time / IST assumed)

### P2 (Polish / growth)
- Razorpay Magic Checkout for higher conversion
- Gift-a-reading flow (purchaser ≠ recipient)
- Yearly horoscope blog with rich SEO

## Recent Changes (this session)

**2026-04-25 (later)** — Visible promo codes during checkout:
1. Created reusable `AvailableOffers` component that fetches `/api/promotions/active`,
   filters by `kind` (services / products), and shows each code prominently with
   "Copy" and "Tap to apply" buttons.
2. Wired into the **BookingDialog** payment step (filter: services_only + site_wide)
   and into the **ShopCheckoutDialog** payment step (filter: products_only + site_wide).
3. Refactored `applyCoupon(codeArg)` in both dialogs to accept an explicit code so the
   tap-to-apply button can populate + validate in one click.
4. Sticky banner: SpecialOfferBanner is now `position: fixed top:0 z-[60]` and
   coordinates with Header (which uses `top: var(--banner-h, 0px)`) so the banner
   stays visible during scroll without overlapping the header. Page content reserves
   the same offset via `<main style={{ paddingTop: 'var(--banner-h, 0px)' }}>`.
   Dismissing the banner smoothly slides the header back to top:0.

**2026-04-25 (earlier)** — Shop Category Management completion:
1. Wired `ProductCategoriesPanel` into `AdminDashboard.jsx` as the new "Shop Categories" tab
   (renamed the existing service-categories tab to "Service Categories" for clarity)
2. Added `Shop category` dropdown in the Add/Edit Product form so admin can pick a
   shop-category when creating products. Existing seed products already linked
   (Candles, Crystals, Oils).
3. Showed each product's assigned category as a chip on the admin product card list
4. Improved alignment of the Shop "Intentional Wellness Products" heading
   (each word on its own line for cleaner balance).
5. Verified end-to-end via curl: create-product-with-category → public `/api/product-categories` reflects it instantly.

## Next Tasks
1. (P0) Plug live Razorpay keys in `/app/backend/.env` (and frontend `RAZORPAY_KEY_ID`)
2. (P1) Activate WhatsApp via Meta Cloud API (need access token + phone number ID)
3. (P1) CSV export endpoints + buttons in admin
