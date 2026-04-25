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
from datetime import datetime, timezone, date as date_type, timedelta
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
    # WhatsApp & Exly feedback (real clients)
    {
        "id": "t1",
        "author": "Khushboo Sahrawat",
        "content": "Beyond thankful for telling me about my grandfather being my spirit guide — there is not a single hour I don't think about him now. I feel so so blessed about taking the reading from you. It reminded me of my strengths, of who I am. It reminded me that I don't have to live in a lack mentality — literally my biggest blessing in present time. Thank you, thank you, thank you. ❤️",
        "rating": 5,
        "source": "Akashic · WhatsApp",
    },
    {
        "id": "t2",
        "author": "Khushali Manoj Bohra",
        "content": "You had told that me and Aashish were soulmates in past life. Yesterday me and Aashish BOTH got the same dream — about being soulmates in the past life! You wereeee soooo accurate about it 😍",
        "rating": 5,
        "source": "Tarot · WhatsApp",
    },
    {
        "id": "t3",
        "author": "Sakshi Sajwan",
        "content": "It was an excellent experience of Akashic reading. I came to realise some important things and patterns I need to break in this life. Thank you for helping me understand which part I actually need to rectify. Lots of wishes 💕",
        "rating": 5,
        "source": "Akashic · 30-min",
    },
    {
        "id": "t4",
        "author": "Aadishree Deka",
        "content": "I liked everything about Jenika and her video session. Most importantly, her every guidance is so useful. And the most important part is the sessions are recorded — so in future we can access these videos and take guidance again.",
        "rating": 5,
        "source": "Recording · 1-hour",
    },
    {
        "id": "t5",
        "author": "Ritu Gour",
        "content": "If a person's last hope is also vanished, then you are the ray of hope so they will revive and survive with that. Excellent. Highly recommended. Thank you so much for your guidance 🙏❤️",
        "rating": 5,
        "source": "Exly Review",
    },
    {
        "id": "t6",
        "author": "Pranoti Raut",
        "content": "The accuracy of your readings and how you straight got into it — predicted things all by yourself and gave effective, realistic solutions while being practical about the situation.",
        "rating": 5,
        "source": "Exly Review",
    },
    {
        "id": "t7",
        "author": "Divyangi Arora",
        "content": "I want to express my deepest gratitude for the incredible insights and guidance you've shared. Your ability to tap into the Akashic records has provided me profound clarity and understanding, helping me grow on my journey ❤️",
        "rating": 5,
        "source": "Akashic · Exly",
    },
    {
        "id": "t8",
        "author": "Nandita Singh",
        "content": "Whatever I wanted to know was clearly answered. The experience was good 😊",
        "rating": 5,
        "source": "Exly Review",
    },
    {
        "id": "t9",
        "author": "Tyagi",
        "content": "Very good experience. You told everything very well. Thank you for understanding everything so well.",
        "rating": 5,
        "source": "Exly Review",
    },
    {
        "id": "t10",
        "author": "Shristi",
        "content": "I am so happy to get my Akashic reading done from Jeni — she is such a great soul. She has not just given me insights of my past life but also helped me with the tricks on how to heal them. She tapped on my current energies so well and told me things that only I am aware of. I'm glad I chose her.",
        "rating": 5,
        "source": "Akashic · Exly",
    },
    {
        "id": "t11",
        "author": "Sneha Vilas Kakad",
        "content": "Thank you so much. Your whole session gave me positive energy. I just love the way you explained each and every thing about my past and present situation. I was getting stuck in some unwanted things but today when I was talking with you, all my things were getting clear.",
        "rating": 5,
        "source": "Exly Review",
    },
    {
        "id": "t12",
        "author": "Sejal Parmar",
        "content": "Words can't express the feeling I felt during the session. The minute we started, I felt peaceful. Each detail was so accurate. So many things became clear, and most importantly the energy we shared during the session is incomparable. Thank you so much, universe.",
        "rating": 5,
        "source": "Exly Review",
    },
    {
        "id": "t13",
        "author": "Rutuja Bankar",
        "content": "Thank you Jenika for wonderful session — so many things you told me have turned out to be right.",
        "rating": 5,
        "source": "Exly Review",
    },
    {
        "id": "t14",
        "author": "Nehha Verma",
        "content": "Thank you Dear Jeni for an amazing Akashic session. You listened to all my concerns very patiently and answered them properly with solutions. You also helped me find the root cause of the pattern I am facing. Thank you from the bottom of my heart 🙏🏻",
        "rating": 5,
        "source": "Akashic · Exly",
    },
    {
        "id": "t15",
        "author": "Ritee Chanababa",
        "content": "When I wasn't sure what to do, when I had a lot of changes going on, and when I needed a little guidance — every single time, you give me exactly what I need. Whether encouragement for the path I'm on, or slight course corrections to get me closer to my goal. God bless 😇",
        "rating": 5,
        "source": "WhatsApp",
    },
    {
        "id": "t16",
        "author": "Payal Punjabi",
        "content": "You told me in Akashic reading that I will get a new opportunity — I got it and will be joining a school soon. Your push to start working made me join as a teacher in summer camp and they offered me to join their school. Thank you for helping me move out of the negativity around me.",
        "rating": 5,
        "source": "Akashic · WhatsApp",
    },
    {
        "id": "t17",
        "author": "Akshata Kulkarni",
        "content": "Was processing the reading 😂 but a lot of it already resonates with me. Thanks a lot for the reading — when life gets chaotic, the reading brings a sense of comfort 😊",
        "rating": 5,
        "source": "WhatsApp",
    },
    {
        "id": "t18",
        "author": "Anikta Gupta",
        "content": "I am so grateful that you were my guide in learning Akasha. The way you have made everything so easy to understand and access — you are the best teacher ever. You are my guiding light in my journey of spirituality. I feel blessed 🌻",
        "rating": 5,
        "source": "Mentorship",
    },
    {
        "id": "t19",
        "author": "Dr Norin Thakkar",
        "content": "Thank you so much. You have been an excellent teacher and your explanation was crisp and to the point. We enjoyed and learned a lot. Thank you for all the self-reflective questions — they are so helpful. I'm glad you are our mentor ❤️",
        "rating": 5,
        "source": "Mentorship",
    },
    # Original Google reviews
    {
        "id": "t20",
        "author": "Paridhi",
        "content": "Jeni is an amazing person who has helped me a lot. Her readings are amazing. If you are facing any problems in life and need guidance she will help you and show you the right path to take. Thanks a lot for your guidance always.",
        "rating": 5,
        "source": "Google",
    },
    {
        "id": "t21",
        "author": "Bhagyshree",
        "content": "The first ever reading I got done was from Jenny in 2020 and all that she said was absolutely to the point. She guided me through the situation I was stuck in and the timeline she gave was apt. I'm really happy to have met a genuine soul like Jenny.",
        "rating": 5,
        "source": "Google",
    },
    {
        "id": "t22",
        "author": "Parul",
        "content": "She's incredible! I learnt tarot and pendulum dowsing from her. Her lessons are super insightful, and the reading she did for me was pretty spot-on. I'm really grateful for her guidance and the support she shares.",
        "rating": 5,
        "source": "Google",
    },
    {
        "id": "t23",
        "author": "Reena",
        "content": "Jeni was extremely accurate in her readings. She did Tarot and Akashic readings for me and my brother. She helped me make decisions in my life where I was getting stuck. She is gifted indeed!",
        "rating": 5,
        "source": "Google",
    },
]


SEED_PRODUCTS = [
    {
        "id": "p-crystals",
        "name": "Energised Crystals",
        "blurb": "Hand-picked rose quartz, amethyst, citrine and clear quartz — cleansed and charged with reiki for their highest purpose.",
        "price_inr": None,
        "badge": "Most Loved",
        "image_url": None,
        "accent": "from-[#C8B6E2] to-[#E6DDF1]",
        "shop_url": "https://guidanceangel7.exlyapp.com",
        "order": 1,
    },
    {
        "id": "p-candles",
        "name": "Intention Candles",
        "blurb": "Soy wax candles infused with herbs, essential oils and mantras — for love, abundance, protection and clarity rituals.",
        "price_inr": None,
        "badge": "Bestseller",
        "image_url": None,
        "accent": "from-[#F4C6D6] to-[#FBE4D5]",
        "shop_url": "https://guidanceangel7.exlyapp.com",
        "order": 2,
    },
    {
        "id": "p-oils",
        "name": "Healing Oils",
        "blurb": "Sacred blends crafted with crystals, herbs and pure essential oils. Anoint candles, pulse points and altars.",
        "price_inr": None,
        "badge": "New",
        "image_url": None,
        "accent": "from-[#EBB99A] to-[#F4C6D6]",
        "shop_url": "https://guidanceangel7.exlyapp.com",
        "order": 3,
    },
]


@app.on_event("startup")
async def seed_db():
    SEED_VERSION = "v6-products-settings"
    meta = await db.app_meta.find_one({"_id": "seed"}, {"_id": 0}) or {}
    if meta.get("version") != SEED_VERSION:
        await db.services.delete_many({})
        await db.categories.delete_many({})
        await db.testimonials.delete_many({})
        await db.products.delete_many({})
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
    products_count = await db.products.count_documents({})
    if products_count == 0:
        await db.products.insert_many([dict(p) for p in SEED_PRODUCTS])
    # Default settings
    settings_doc = await db.settings.find_one({"_id": "main"})
    if not settings_doc:
        await db.settings.insert_one({
            "_id": "main",
            "open_hour": 10,
            "close_hour": 20,
            "slot_minutes": 30,
            "open_days": [0, 1, 2, 3, 4, 5],
        })
    logger.info(
        f"DB seeded {SEED_VERSION}. Cats: {await db.categories.count_documents({})}, "
        f"Services: {await db.services.count_documents({})}, "
        f"Products: {await db.products.count_documents({})}, "
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


async def _get_settings() -> dict:
    s = await db.settings.find_one({"_id": "main"}, {"_id": 0}) or {}
    return {
        "open_hour": s.get("open_hour", 10),
        "close_hour": s.get("close_hour", 20),
        "slot_minutes": s.get("slot_minutes", 30),
        "open_days": s.get("open_days", [0, 1, 2, 3, 4, 5]),  # 0=Mon ... 6=Sun (Sun closed default)
    }


@api_router.get("/slots/{date_str}")
async def available_slots(date_str: str):
    """Return available slots for a date — driven by admin settings."""
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

    settings = await _get_settings()
    if d.weekday() not in settings["open_days"]:
        return {"date": date_str, "slots": [], "is_open": False, "message": "Closed on this day"}

    blocked = await db.blocked_dates.find_one({"date": date_str}, {"_id": 0})
    if blocked:
        return {
            "date": date_str,
            "slots": [],
            "is_open": False,
            "message": blocked.get("reason") or "Unavailable on this date",
        }

    # Generate slots from open_hour:00 to (close_hour-1):30 in slot_minutes increments
    all_slots = []
    cur = datetime(2000, 1, 1, settings["open_hour"], 0)
    end = datetime(2000, 1, 1, settings["close_hour"], 0)
    step = timedelta(minutes=settings["slot_minutes"])
    while cur < end:
        all_slots.append(cur.strftime("%I:%M %p").lstrip("0"))
        cur += step

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


# ============== Settings (admin) ==============
class Settings(BaseModel):
    open_hour: int = 10
    close_hour: int = 20
    slot_minutes: int = 30
    open_days: List[int] = [0, 1, 2, 3, 4, 5]


@api_router.get("/admin/settings")
async def admin_get_settings(_admin: str = Depends(verify_admin)):
    return await _get_settings()


@api_router.put("/admin/settings")
async def admin_update_settings(
    payload: Settings, _admin: str = Depends(verify_admin)
):
    if not (0 <= payload.open_hour < 24) or not (0 < payload.close_hour <= 24):
        raise HTTPException(status_code=400, detail="Hours must be in 0–24 range")
    if payload.open_hour >= payload.close_hour:
        raise HTTPException(status_code=400, detail="open_hour must be before close_hour")
    if payload.slot_minutes not in (15, 20, 30, 45, 60, 90, 120):
        raise HTTPException(status_code=400, detail="Slot minutes must be 15/20/30/45/60/90/120")
    await db.settings.update_one(
        {"_id": "main"},
        {"$set": payload.model_dump()},
        upsert=True,
    )
    return {"success": True, **payload.model_dump()}


# ============== Categories CRUD (admin) ==============
class CategoryIn(BaseModel):
    id: str
    name: str
    tagline: Optional[str] = ""
    description: Optional[str] = ""
    icon: Optional[str] = "stars"
    order: int = 100


@api_router.get("/admin/categories")
async def admin_list_categories(_admin: str = Depends(verify_admin)):
    docs = await db.categories.find({}, {"_id": 0}).sort("order", 1).to_list(length=100)
    return docs


@api_router.post("/admin/categories")
async def admin_create_category(payload: CategoryIn, _admin: str = Depends(verify_admin)):
    existing = await db.categories.find_one({"id": payload.id})
    if existing:
        raise HTTPException(status_code=409, detail="Category id already exists")
    await db.categories.insert_one(payload.model_dump())
    return {"success": True, "category": payload.model_dump()}


@api_router.put("/admin/categories/{cat_id}")
async def admin_update_category(cat_id: str, payload: CategoryIn, _admin: str = Depends(verify_admin)):
    res = await db.categories.update_one(
        {"id": cat_id}, {"$set": payload.model_dump()}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"success": True}


@api_router.delete("/admin/categories/{cat_id}")
async def admin_delete_category(cat_id: str, _admin: str = Depends(verify_admin)):
    # Also delete services in that category
    await db.services.delete_many({"category": cat_id})
    res = await db.categories.delete_one({"id": cat_id})
    return {"success": True, "removed": res.deleted_count}


# ============== Services CRUD (admin) ==============
class ServiceIn(BaseModel):
    id: str
    category: str
    name: str
    duration_minutes: Optional[int] = None
    price_inr: int
    description: str = ""
    is_voice_note: bool = False
    variant: Optional[str] = "call"
    program_days: Optional[int] = None


@api_router.get("/admin/services")
async def admin_list_services(_admin: str = Depends(verify_admin)):
    docs = await db.services.find({}, {"_id": 0}).to_list(length=500)
    return docs


@api_router.post("/admin/services")
async def admin_create_service(payload: ServiceIn, _admin: str = Depends(verify_admin)):
    if await db.services.find_one({"id": payload.id}):
        raise HTTPException(status_code=409, detail="Service id already exists")
    await db.services.insert_one(payload.model_dump())
    return {"success": True}


@api_router.put("/admin/services/{service_id}")
async def admin_update_service(service_id: str, payload: ServiceIn, _admin: str = Depends(verify_admin)):
    res = await db.services.update_one({"id": service_id}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"success": True}


@api_router.delete("/admin/services/{service_id}")
async def admin_delete_service(service_id: str, _admin: str = Depends(verify_admin)):
    res = await db.services.delete_one({"id": service_id})
    return {"success": True, "removed": res.deleted_count}


# ============== Testimonials CRUD (admin) ==============
class TestimonialIn(BaseModel):
    id: str
    author: str
    content: str
    rating: int = 5
    source: Optional[str] = ""


@api_router.get("/admin/testimonials")
async def admin_list_testimonials(_admin: str = Depends(verify_admin)):
    docs = await db.testimonials.find({}, {"_id": 0}).to_list(length=500)
    return docs


@api_router.post("/admin/testimonials")
async def admin_create_testimonial(payload: TestimonialIn, _admin: str = Depends(verify_admin)):
    if await db.testimonials.find_one({"id": payload.id}):
        raise HTTPException(status_code=409, detail="Testimonial id already exists")
    await db.testimonials.insert_one(payload.model_dump())
    return {"success": True}


@api_router.put("/admin/testimonials/{tid}")
async def admin_update_testimonial(tid: str, payload: TestimonialIn, _admin: str = Depends(verify_admin)):
    res = await db.testimonials.update_one({"id": tid}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    return {"success": True}


@api_router.delete("/admin/testimonials/{tid}")
async def admin_delete_testimonial(tid: str, _admin: str = Depends(verify_admin)):
    res = await db.testimonials.delete_one({"id": tid})
    return {"success": True, "removed": res.deleted_count}


# ============== Products (Sacred Shop) ==============
class ProductIn(BaseModel):
    id: str
    name: str
    blurb: str = ""
    price_inr: Optional[int] = None
    badge: Optional[str] = None
    image_url: Optional[str] = None  # can be solid/gradient color name or image URL
    accent: Optional[str] = "from-[#C8B6E2] to-[#E6DDF1]"
    shop_url: Optional[str] = None
    order: int = 100


@api_router.get("/products")
async def public_list_products():
    docs = await db.products.find({}, {"_id": 0}).sort("order", 1).to_list(length=200)
    return docs


@api_router.get("/admin/products")
async def admin_list_products(_admin: str = Depends(verify_admin)):
    docs = await db.products.find({}, {"_id": 0}).sort("order", 1).to_list(length=500)
    return docs


@api_router.post("/admin/products")
async def admin_create_product(payload: ProductIn, _admin: str = Depends(verify_admin)):
    if await db.products.find_one({"id": payload.id}):
        raise HTTPException(status_code=409, detail="Product id already exists")
    await db.products.insert_one(payload.model_dump())
    return {"success": True}


@api_router.put("/admin/products/{pid}")
async def admin_update_product(pid: str, payload: ProductIn, _admin: str = Depends(verify_admin)):
    res = await db.products.update_one({"id": pid}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True}


@api_router.delete("/admin/products/{pid}")
async def admin_delete_product(pid: str, _admin: str = Depends(verify_admin)):
    res = await db.products.delete_one({"id": pid})
    return {"success": True, "removed": res.deleted_count}


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
