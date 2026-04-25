from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, date as date_type
import hmac
import hashlib
import jwt
import razorpay
from email_service import send_booking_confirmation
from whatsapp_service import send_booking_whatsapp


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Razorpay setup
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_PLACEHOLDER')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', 'placeholder_secret')
USE_MOCK_PAYMENT = RAZORPAY_KEY_ID == 'rzp_test_PLACEHOLDER' or RAZORPAY_KEY_SECRET == 'placeholder_secret'

razorpay_client = None
if not USE_MOCK_PAYMENT:
    try:
        razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    except Exception as e:
        logging.warning(f"Razorpay init failed: {e}. Falling back to mock.")

# Auth
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'jenika')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'guidance@2026')
JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ============== Models ==============
class Service(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    category: str  # tarot_numerology | akashic | all_in_one | month_ahead | healing
    name: str
    duration_minutes: Optional[int] = None
    price_inr: int
    description: str
    is_voice_note: bool = False
    variant: Optional[str] = None  # call | voice_note | program
    program_days: Optional[int] = None


class BookingCreate(BaseModel):
    service_id: str
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    booking_date: Optional[str] = None  # ISO date string YYYY-MM-DD (required for live readings)
    booking_slot: Optional[str] = None  # e.g., "10:00 AM"
    birth_date: Optional[str] = None
    birth_time: Optional[str] = None
    birth_place: Optional[str] = None
    question: Optional[str] = None
    notes: Optional[str] = None


class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    service_id: str
    service_name: str
    service_price_inr: int
    customer_name: str
    customer_email: str
    customer_phone: str
    booking_date: Optional[str] = None
    booking_slot: Optional[str] = None
    birth_date: Optional[str] = None
    birth_time: Optional[str] = None
    birth_place: Optional[str] = None
    question: Optional[str] = None
    notes: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    payment_status: str = "pending"  # pending | paid | failed
    booking_status: str = "pending"  # pending | confirmed | completed | cancelled
    is_mock_payment: bool = False
    created_at: str


class CreateOrderResponse(BaseModel):
    booking_id: str
    razorpay_order_id: str
    razorpay_key_id: str
    amount_paise: int
    currency: str = "INR"
    is_mock: bool = False


class VerifyPayment(BaseModel):
    booking_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: Optional[str] = None  # not required for mock


class AdminLogin(BaseModel):
    username: str
    password: str


class Testimonial(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    author: str
    content: str
    rating: int = 5
    source: Optional[str] = None  # google | instagram | website


# ============== Seed Data ==============
SEED_CATEGORIES = [
    {
        "id": "tarot_numerology_call",
        "name": "Tarot + Numerology · Call Reading",
        "tagline": "Live 1-on-1 call · clarity in real-time",
        "description": "A live call session blending intuitive tarot insights with ancient numerology — clarity, timelines and direction on love, career and life choices.",
        "icon": "stars",
        "order": 1,
    },
    {
        "id": "tarot_numerology_question",
        "name": "Tarot + Numerology · Question Reading",
        "tagline": "Recorded voice notes · 48-hour delivery",
        "description": "Ask 1, 2, 3 or 5 specific questions and receive a personalised tarot + numerology voice note within 48 hours. Perfect for quick guidance.",
        "icon": "headphones",
        "order": 2,
    },
    {
        "id": "akashic",
        "name": "Akashic Records Reading",
        "tagline": "Look through your soul's library",
        "description": "Access the records of your eternal life to view long-ago past patterns, present soul lessons and your potential future. Discover karmic threads still influencing you today.",
        "icon": "book",
        "order": 3,
    },
    {
        "id": "all_in_one",
        "name": "All In One Mega Reading",
        "tagline": "The complete soul deep-dive",
        "description": "Overall reading covering your patterns, childhood, behaviour, strengths and weaknesses — a complete in-depth analysis of who you are and your highest potential. Includes Tarot + Numerology + Akashic.",
        "icon": "sparkles",
        "order": 4,
    },
    {
        "id": "month_ahead",
        "name": "Month Ahead Reading",
        "tagline": "Your timeline, foretold",
        "description": "A forward-looking guidance reading covering the month, quarter or year ahead. Combines tarot, numerology and Akashic insights into a clear timeline forecast.",
        "icon": "calendar",
        "order": 5,
    },
    {
        "id": "healing",
        "name": "Intention Healing / Cleansing",
        "tagline": "Reiki + Merlin healing journeys",
        "description": "Daily reiki and merlin healing sessions over 1 week or 21 days. Personalised music to listen to at scheduled time daily, with feedback discussion via WhatsApp voice notes.",
        "icon": "heart",
        "order": 6,
    },
]

SEED_SERVICES = [
    # Tarot + Numerology — Calls
    {"id": "tn-15-call", "category": "tarot_numerology_call", "name": "15-min Call Reading", "duration_minutes": 15, "price_inr": 2100,
     "description": "A focused 15-minute call session blending tarot insights with numerology guidance for one specific question.", "is_voice_note": False, "variant": "call"},
    {"id": "tn-30-call", "category": "tarot_numerology_call", "name": "30-min Call Reading", "duration_minutes": 30, "price_inr": 4000,
     "description": "A 30-minute call exploring multiple aspects of your life with deeper numerology layers.", "is_voice_note": False, "variant": "call"},
    {"id": "tn-45-call", "category": "tarot_numerology_call", "name": "45-min Call Reading", "duration_minutes": 45, "price_inr": 6500,
     "description": "An in-depth 45-minute call covering relationships, career, finances and life path.", "is_voice_note": False, "variant": "call"},
    # Tarot + Numerology — Voice Note Question Readings
    {"id": "tn-q1", "category": "tarot_numerology_question", "name": "1 Question Reading", "duration_minutes": None, "price_inr": 550,
     "description": "Ask one specific question — receive a recorded voice note answer within 48 hours.", "is_voice_note": True, "variant": "voice_note"},
    {"id": "tn-q2", "category": "tarot_numerology_question", "name": "2 Questions Reading", "duration_minutes": None, "price_inr": 1000,
     "description": "Two questions answered as a recorded voice note within 48 hours.", "is_voice_note": True, "variant": "voice_note"},
    {"id": "tn-q3", "category": "tarot_numerology_question", "name": "3 Questions Reading", "duration_minutes": None, "price_inr": 1500,
     "description": "Three questions answered as a recorded voice note within 48 hours.", "is_voice_note": True, "variant": "voice_note"},
    {"id": "tn-q5", "category": "tarot_numerology_question", "name": "5 Questions Reading", "duration_minutes": None, "price_inr": 2200,
     "description": "Five questions answered as a recorded voice note within 48 hours.", "is_voice_note": True, "variant": "voice_note"},

    # Akashic — Calls only
    {"id": "ak-30", "category": "akashic", "name": "30-min Call Reading", "duration_minutes": 30, "price_inr": 4000,
     "description": "Access your soul records for clarity on past patterns and your soul's current chapter.", "is_voice_note": False, "variant": "call"},
    {"id": "ak-45", "category": "akashic", "name": "45-min Call Reading", "duration_minutes": 45, "price_inr": 5500,
     "description": "An expanded Akashic session diving into karmic threads, relationships and life lessons.", "is_voice_note": False, "variant": "call"},
    {"id": "ak-60", "category": "akashic", "name": "60-min Call Reading", "duration_minutes": 60, "price_inr": 7500,
     "description": "A complete one-hour Akashic journey – soul gifts, blocks, healings and forward path.", "is_voice_note": False, "variant": "call"},

    # All In One Mega
    {"id": "aio-60", "category": "all_in_one", "name": "1 Hour Mega Reading", "duration_minutes": 60, "price_inr": 10500,
     "description": "Complete soul deep-dive — Tarot + Numerology + Akashic combined. Your patterns, childhood, behaviour, strengths and best potential future, all in one hour.", "is_voice_note": False, "variant": "call"},

    # Month Ahead — voice note delivered
    {"id": "ma-1m", "category": "month_ahead", "name": "1 Month Guidance", "duration_minutes": None, "price_inr": 1500,
     "description": "Your month-ahead forecast — combining tarot + numerology + Akashic insights, delivered as a recorded voice note.", "is_voice_note": True, "variant": "voice_note"},
    {"id": "ma-3m", "category": "month_ahead", "name": "3 Month Guidance", "duration_minutes": None, "price_inr": 3000,
     "description": "Quarterly forecast covering the next 3 months across love, career, finances and growth.", "is_voice_note": True, "variant": "voice_note"},
    {"id": "ma-1y", "category": "month_ahead", "name": "1 Year Guidance", "duration_minutes": None, "price_inr": 5000,
     "description": "Your year-ahead deep forecast — month by month — delivered as a recorded voice note.", "is_voice_note": True, "variant": "voice_note"},

    # Intention Healing / Cleansing — multi-day programs (require start date+slot)
    {"id": "heal-20-7", "category": "healing", "name": "20 Mins × 1 Week", "duration_minutes": 20, "price_inr": 4100,
     "description": "20-minute daily healing session for 7 days. Reiki + merlin healing with personalised music. Daily feedback via WhatsApp.", "is_voice_note": False, "variant": "program", "program_days": 7},
    {"id": "heal-20-21", "category": "healing", "name": "20 Mins × 21 Days", "duration_minutes": 20, "price_inr": 6100,
     "description": "20-minute daily healing session for 21 days — a deeper transformation cycle.", "is_voice_note": False, "variant": "program", "program_days": 21},
    {"id": "heal-30-7", "category": "healing", "name": "30 Mins × 1 Week", "duration_minutes": 30, "price_inr": 5100,
     "description": "30-minute daily healing session for 7 days. Reiki + merlin healing with personalised music.", "is_voice_note": False, "variant": "program", "program_days": 7},
    {"id": "heal-30-21", "category": "healing", "name": "30 Mins × 21 Days", "duration_minutes": 30, "price_inr": 7100,
     "description": "30-minute daily healing session for 21 days — our deepest cleansing program.", "is_voice_note": False, "variant": "program", "program_days": 21},
]

SEED_TESTIMONIALS = [
    {"id": "t1", "author": "Paridhi", "content": "Jeni is an amazing person who has helped me a lot. Her readings are amazing. If you are facing any problems in life and need guidance she will help you and show you the right path to take. Thanks a lot for your guidance always.", "rating": 5, "source": "website"},
    {"id": "t2", "author": "Bhagyshree", "content": "The first ever reading I got done was from Jenny in 2020 and all that she said was absolutely to the point. She guided me through the situation I was stuck in and also the timeline she gave was apt. I'm really happy to have met a genuine soul like Jenny.", "rating": 5, "source": "website"},
    {"id": "t3", "author": "Parul", "content": "She's incredible! I learnt tarot and pendulum dowsing from her. Her lessons are super insightful, and the reading she did for me was pretty spot-on. I'm really grateful for her guidance and the support she shares.", "rating": 5, "source": "website"},
    {"id": "t4", "author": "Reena", "content": "Jeni was extremely accurate in her readings! She did Tarot reading and Akashic reading for me and my brother. She helped me understand and make some decisions in my life where I was getting stuck! She is a wealth of knowledge and really helped guide me through a difficult time. I would highly recommend Jeni to all – she is gifted indeed!", "rating": 5, "source": "website"},
    {"id": "t5", "author": "Aanya", "content": "Booked a Tarotscope on Exly and was blown away – every detail rang true and the voice note format made it feel personal. Already gifted one to my sister!", "rating": 5, "source": "instagram"},
    {"id": "t6", "author": "Ishaan", "content": "Jenika's Akashic Record reading gave me clarity I was searching for during a major career shift. She is gentle, accurate and deeply intuitive.", "rating": 5, "source": "google"},
    {"id": "t7", "author": "Megha", "content": "Beautiful soul, beautiful guidance. The numerology report was so detailed and matched my year exactly. Highly recommend.", "rating": 5, "source": "google"},
    {"id": "t8", "author": "Ritika", "content": "I've consulted Jeni multiple times over the past 3 years. She has a rare gift and her readings always come from a place of love. Sisterly and clear.", "rating": 5, "source": "instagram"},
]


@app.on_event("startup")
async def seed_db():
    SEED_VERSION = "v3-categories-split"
    meta = await db.app_meta.find_one({"_id": "seed"}, {"_id": 0}) or {}
    if meta.get("version") != SEED_VERSION:
        await db.services.delete_many({})
        await db.categories.delete_many({})
        await db.app_meta.update_one(
            {"_id": "seed"}, {"$set": {"version": SEED_VERSION}}, upsert=True
        )
    services_count = await db.services.count_documents({})
    if services_count == 0:
        await db.services.insert_many([dict(s) for s in SEED_SERVICES])
    categories_count = await db.categories.count_documents({})
    if categories_count == 0:
        await db.categories.insert_many([dict(c) for c in SEED_CATEGORIES])
    testimonials_count = await db.testimonials.count_documents({})
    if testimonials_count == 0:
        await db.testimonials.insert_many([dict(t) for t in SEED_TESTIMONIALS])
    logger.info(
        f"DB seeded {SEED_VERSION}. Cats: {await db.categories.count_documents({})}, "
        f"Services: {await db.services.count_documents({})}, "
        f"Testimonials: {await db.testimonials.count_documents({})}"
    )


# ============== Helpers ==============
def make_admin_token(username: str) -> str:
    return jwt.encode({"sub": username, "role": "admin"}, JWT_SECRET, algorithm="HS256")


def verify_admin(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Forbidden")
        return payload.get("sub", "admin")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============== Public Endpoints ==============
@api_router.get("/")
async def root():
    return {"message": "Guidance Angel API", "razorpay_mode": "mock" if USE_MOCK_PAYMENT else "live"}


@api_router.get("/services", response_model=List[Service])
async def list_services():
    docs = await db.services.find({}, {"_id": 0}).to_list(length=200)
    return docs


@api_router.get("/categories")
async def list_categories():
    """Return categories with their nested services."""
    cats = await db.categories.find({}, {"_id": 0}).sort("order", 1).to_list(length=20)
    services = await db.services.find({}, {"_id": 0}).to_list(length=200)
    by_cat: dict[str, list] = {}
    for s in services:
        by_cat.setdefault(s["category"], []).append(s)
    for c in cats:
        c["services"] = by_cat.get(c["id"], [])
    return cats


@api_router.get("/testimonials", response_model=List[Testimonial])
async def list_testimonials():
    docs = await db.testimonials.find({}, {"_id": 0}).to_list(length=100)
    return docs


@api_router.get("/slots/{date_str}")
async def available_slots(date_str: str):
    """Return available slots for a date (default 10 AM - 8 PM Mon-Sat, 30-min)."""
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")
    if d.weekday() == 6:  # Sunday
        return {"date": date_str, "slots": [], "is_open": False, "message": "Closed on Sundays"}
    # Check admin block-out
    blocked = await db.blocked_dates.find_one({"date": date_str}, {"_id": 0})
    if blocked:
        return {
            "date": date_str,
            "slots": [],
            "is_open": False,
            "message": blocked.get("reason") or "Unavailable on this date",
        }
    # Generate slots 10:00 to 19:30 (last slot starts at 7:30 PM)
    all_slots = []
    for hour in range(10, 20):
        for minute in (0, 30):
            if hour == 19 and minute == 30:
                continue
            label = datetime(2000, 1, 1, hour, minute).strftime("%I:%M %p").lstrip("0")
            all_slots.append(label)
    # Remove already booked slots
    booked = await db.bookings.find(
        {"booking_date": date_str, "payment_status": "paid"},
        {"_id": 0, "booking_slot": 1}
    ).to_list(length=200)
    booked_set = {b["booking_slot"] for b in booked if b.get("booking_slot")}
    available = [s for s in all_slots if s not in booked_set]
    return {"date": date_str, "slots": available, "is_open": True}


@api_router.post("/bookings/create-order", response_model=CreateOrderResponse)
async def create_order(payload: BookingCreate):
    service = await db.services.find_one({"id": payload.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Validate booking_date / slot for live readings
    if not service["is_voice_note"]:
        if not payload.booking_date or not payload.booking_slot:
            raise HTTPException(status_code=400, detail="booking_date and booking_slot are required for live readings")

    booking_id = str(uuid.uuid4())
    amount_paise = service["price_inr"] * 100

    if USE_MOCK_PAYMENT or razorpay_client is None:
        razorpay_order_id = f"order_mock_{uuid.uuid4().hex[:14]}"
        is_mock = True
    else:
        try:
            order = razorpay_client.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "receipt": booking_id[:40],
                "payment_capture": 1,
            })
            razorpay_order_id = order["id"]
            is_mock = False
        except Exception as e:
            logger.error(f"Razorpay order creation failed: {e}")
            raise HTTPException(status_code=502, detail="Payment provider error")

    booking_doc = {
        "id": booking_id,
        "service_id": service["id"],
        "service_name": service["name"] + (f" ({service['duration_minutes']} min)" if service.get("duration_minutes") else ""),
        "service_price_inr": service["price_inr"],
        "customer_name": payload.customer_name,
        "customer_email": payload.customer_email,
        "customer_phone": payload.customer_phone,
        "booking_date": payload.booking_date,
        "booking_slot": payload.booking_slot,
        "birth_date": payload.birth_date,
        "birth_time": payload.birth_time,
        "birth_place": payload.birth_place,
        "question": payload.question,
        "notes": payload.notes,
        "razorpay_order_id": razorpay_order_id,
        "razorpay_payment_id": None,
        "payment_status": "pending",
        "booking_status": "pending",
        "is_mock_payment": is_mock,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(booking_doc)

    return CreateOrderResponse(
        booking_id=booking_id,
        razorpay_order_id=razorpay_order_id,
        razorpay_key_id=RAZORPAY_KEY_ID,
        amount_paise=amount_paise,
        currency="INR",
        is_mock=is_mock,
    )


@api_router.post("/bookings/verify-payment")
async def verify_payment(payload: VerifyPayment):
    booking = await db.bookings.find_one({"id": payload.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["razorpay_order_id"] != payload.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Order ID mismatch")

    is_mock = booking.get("is_mock_payment", False) or USE_MOCK_PAYMENT
    if is_mock:
        # Trust client in mock mode
        verified = True
    else:
        if not payload.razorpay_signature:
            raise HTTPException(status_code=400, detail="Signature required")
        body = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}"
        expected = hmac.new(
            RAZORPAY_KEY_SECRET.encode(),
            body.encode(),
            hashlib.sha256,
        ).hexdigest()
        verified = hmac.compare_digest(expected, payload.razorpay_signature)
        if not verified:
            await db.bookings.update_one(
                {"id": payload.booking_id},
                {"$set": {"payment_status": "failed"}}
            )
            raise HTTPException(status_code=400, detail="Signature verification failed")

    await db.bookings.update_one(
        {"id": payload.booking_id},
        {"$set": {
            "razorpay_payment_id": payload.razorpay_payment_id,
            "payment_status": "paid",
            "booking_status": "confirmed",
        }}
    )
    updated = await db.bookings.find_one({"id": payload.booking_id}, {"_id": 0})
    # Fire-and-forget email + WhatsApp confirmation (won't block / fail the response)
    try:
        email_id = await send_booking_confirmation(updated)
        if email_id:
            await db.bookings.update_one(
                {"id": payload.booking_id},
                {"$set": {"confirmation_email_id": email_id}}
            )
    except Exception as e:
        logger.warning(f"Email send failed (non-blocking): {e}")
    try:
        wa_id = await send_booking_whatsapp(updated)
        if wa_id:
            await db.bookings.update_one(
                {"id": payload.booking_id},
                {"$set": {"confirmation_whatsapp_id": wa_id}}
            )
    except Exception as e:
        logger.warning(f"WhatsApp send failed (non-blocking): {e}")
    return {"success": True, "booking": updated, "is_mock": is_mock}


# ============== Admin Endpoints ==============
@api_router.post("/admin/login")
async def admin_login(payload: AdminLogin):
    if payload.username != ADMIN_USERNAME or payload.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": make_admin_token(payload.username), "username": payload.username}


@api_router.get("/admin/bookings", response_model=List[Booking])
async def admin_list_bookings(_admin: str = Depends(verify_admin)):
    docs = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=500)
    return docs


class BookingStatusUpdate(BaseModel):
    booking_status: str  # pending | confirmed | completed | cancelled | no_show


@api_router.patch("/admin/bookings/{booking_id}")
async def admin_update_booking(
    booking_id: str,
    payload: BookingStatusUpdate,
    _admin: str = Depends(verify_admin),
):
    allowed = {"pending", "confirmed", "completed", "cancelled", "no_show"}
    if payload.booking_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {allowed}")
    res = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"booking_status": payload.booking_status}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"success": True, "booking_status": payload.booking_status}


@api_router.get("/admin/stats")
async def admin_stats(_admin: str = Depends(verify_admin)):
    total = await db.bookings.count_documents({})
    paid = await db.bookings.count_documents({"payment_status": "paid"})
    pending = await db.bookings.count_documents({"payment_status": "pending"})
    revenue_pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "revenue": {"$sum": "$service_price_inr"}}},
    ]
    revenue_doc = await db.bookings.aggregate(revenue_pipeline).to_list(length=1)
    revenue = revenue_doc[0]["revenue"] if revenue_doc else 0
    return {"total_bookings": total, "paid": paid, "pending": pending, "revenue_inr": revenue}


# --- Block-out dates (admin) ---
class BlockedDate(BaseModel):
    date: str  # YYYY-MM-DD
    reason: Optional[str] = None


@api_router.get("/admin/blocked-dates")
async def list_blocked_dates(_admin: str = Depends(verify_admin)):
    docs = await db.blocked_dates.find({}, {"_id": 0}).sort("date", 1).to_list(length=500)
    return docs


@api_router.post("/admin/blocked-dates")
async def add_blocked_date(payload: BlockedDate, _admin: str = Depends(verify_admin)):
    try:
        datetime.strptime(payload.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")
    await db.blocked_dates.update_one(
        {"date": payload.date},
        {"$set": {"date": payload.date, "reason": payload.reason or "Unavailable"}},
        upsert=True,
    )
    return {"success": True, "date": payload.date}


@api_router.delete("/admin/blocked-dates/{date_str}")
async def remove_blocked_date(date_str: str, _admin: str = Depends(verify_admin)):
    res = await db.blocked_dates.delete_one({"date": date_str})
    return {"success": True, "removed": res.deleted_count}


# Public: list blocked dates so calendar can mark them
@api_router.get("/blocked-dates")
async def public_blocked_dates():
    docs = await db.blocked_dates.find({}, {"_id": 0, "reason": 0}).to_list(length=500)
    return [d["date"] for d in docs]


# ============== Wire-up ==============
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
