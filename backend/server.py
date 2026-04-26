from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import json
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, date as date_type, timedelta
import hmac
import hashlib
import jwt
import razorpay
from email_service import send_booking_confirmation, send_order_confirmation
from whatsapp_service import send_booking_whatsapp, send_order_whatsapp


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

# Razorpay redirect / webhook config
# FRONTEND_URL: absolute origin used to redirect users back from the backend
# payment-callback to the SPA. Defaults to "" — when empty we issue a relative
# redirect (`/payment-success?...`) which works whenever frontend & backend
# share a domain (Emergent ingress, custom domains via the same proxy).
FRONTEND_URL = os.environ.get('FRONTEND_URL', '').rstrip('/')
RAZORPAY_WEBHOOK_SECRET = os.environ.get('RAZORPAY_WEBHOOK_SECRET', '')

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
    booking_date: Optional[str] = None
    booking_slot: Optional[str] = None
    birth_date: Optional[str] = None
    birth_time: Optional[str] = None
    birth_place: Optional[str] = None
    question: Optional[str] = None
    notes: Optional[str] = None
    coupon_code: Optional[str] = None


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


SEED_PRODUCT_CATEGORIES = [
    {
        "id": "candles",
        "name": "Intention Candles",
        "description": "Hand-poured soy wax candles infused with herbs, oils and mantras for love, abundance, protection and more.",
        "accent": "from-[#F4C6D6] to-[#FBE4D5]",
        "icon": "flame",
        "order": 1,
    },
    {
        "id": "crystals",
        "name": "Energised Crystals",
        "description": "Hand-picked, cleansed and reiki-charged crystals — singles and curated sets.",
        "accent": "from-[#C8B6E2] to-[#E6DDF1]",
        "icon": "gem",
        "order": 2,
    },
    {
        "id": "oils",
        "name": "Healing Oils",
        "description": "Sacred roll-on blends of crystals, herbs and pure essential oils for ritual & daily use.",
        "accent": "from-[#EBB99A] to-[#F4C6D6]",
        "icon": "droplet",
        "order": 3,
    },
]

SEED_PRODUCTS = [
    # Candles (variants)
    {"id": "candle-money", "product_category_id": "candles", "name": "Money Candle", "blurb": "Citrine + bay-leaf candle to align you with abundance, prosperity and overflow. Burn during a new-moon.", "price_inr": 799, "badge": "Bestseller", "image_url": None, "accent": "from-[#EBB99A] to-[#F4C6D6]", "in_stock": True, "order": 1, "tags": ["money", "abundance"]},
    {"id": "candle-love", "product_category_id": "candles", "name": "Love Candle", "blurb": "Rose-quartz + jasmine candle to draw in self-love, romance and harmonious relationships.", "price_inr": 799, "badge": "Most Loved", "image_url": None, "accent": "from-[#F4C6D6] to-[#FBE4D5]", "in_stock": True, "order": 2, "tags": ["love"]},
    {"id": "candle-protection", "product_category_id": "candles", "name": "Protection Candle", "blurb": "Black tourmaline + sage candle to shield your aura, clear negative energy and protect your space.", "price_inr": 899, "badge": None, "image_url": None, "accent": "from-[#9B8AC4] to-[#6B5B95]", "in_stock": True, "order": 3, "tags": ["protection"]},
    {"id": "candle-clarity", "product_category_id": "candles", "name": "Clarity Candle", "blurb": "Clear quartz + lavender candle to dissolve confusion and bring crystal-clear answers.", "price_inr": 799, "badge": "New", "image_url": None, "accent": "from-[#C8B6E2] to-[#E6DDF1]", "in_stock": True, "order": 4, "tags": ["clarity"]},

    # Crystals (variants)
    {"id": "crystal-rosequartz", "product_category_id": "crystals", "name": "Rose Quartz Heart", "blurb": "Hand-cut rose quartz heart — the stone of unconditional love, healing and gentle self-acceptance.", "price_inr": 599, "badge": None, "image_url": None, "accent": "from-[#F4C6D6] to-[#FBE4D5]", "in_stock": True, "order": 1, "tags": ["love"]},
    {"id": "crystal-amethyst", "product_category_id": "crystals", "name": "Amethyst Cluster", "blurb": "Raw amethyst cluster for intuition, deep sleep, spiritual protection and meditation.", "price_inr": 1199, "badge": "Most Loved", "image_url": None, "accent": "from-[#9B8AC4] to-[#C8B6E2]", "in_stock": True, "order": 2, "tags": ["protection", "intuition"]},
    {"id": "crystal-citrine", "product_category_id": "crystals", "name": "Citrine Tumble", "blurb": "Polished citrine tumble — the merchant's stone for abundance, joy and creative flow.", "price_inr": 449, "badge": None, "image_url": None, "accent": "from-[#EBB99A] to-[#F4C6D6]", "in_stock": True, "order": 3, "tags": ["money", "abundance"]},
    {"id": "crystal-set", "product_category_id": "crystals", "name": "Starter Crystal Set", "blurb": "Curated set of 4 essential crystals — rose quartz, amethyst, citrine, clear quartz. Perfect for beginners.", "price_inr": 1499, "badge": "Bestseller", "image_url": None, "accent": "from-[#C8B6E2] to-[#E6DDF1]", "in_stock": True, "order": 4, "tags": ["love", "money", "protection", "clarity"]},

    # Oils (variants)
    {"id": "oil-abundance", "product_category_id": "oils", "name": "Abundance Oil", "blurb": "Roll-on oil with citrine chips, basil, cinnamon — anoint candles, wallets, pulse points before manifestation.", "price_inr": 999, "badge": None, "image_url": None, "accent": "from-[#EBB99A] to-[#F4C6D6]", "in_stock": True, "order": 1, "tags": ["money", "abundance"]},
    {"id": "oil-love", "product_category_id": "oils", "name": "Love & Self-Love Oil", "blurb": "Rose, ylang-ylang and rose-quartz infused oil for opening the heart chakra.", "price_inr": 999, "badge": "New", "image_url": None, "accent": "from-[#F4C6D6] to-[#FBE4D5]", "in_stock": True, "order": 2, "tags": ["love"]},
    {"id": "oil-clarity", "product_category_id": "oils", "name": "Clarity & Focus Oil", "blurb": "Peppermint, rosemary and clear quartz — anoint your temples before any reading or decision.", "price_inr": 899, "badge": None, "image_url": None, "accent": "from-[#C8B6E2] to-[#E6DDF1]", "in_stock": True, "order": 3, "tags": ["clarity"]},
]


@app.on_event("startup")
async def seed_db():
    SEED_VERSION = "v9-product-tags"
    meta = await db.app_meta.find_one({"_id": "seed"}, {"_id": 0}) or {}
    if meta.get("version") != SEED_VERSION:
        await db.services.delete_many({})
        await db.categories.delete_many({})
        await db.testimonials.delete_many({})
        await db.products.delete_many({})
        await db.product_categories.delete_many({})
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
    pc_count = await db.product_categories.count_documents({})
    if pc_count == 0:
        await db.product_categories.insert_many([dict(c) for c in SEED_PRODUCT_CATEGORIES])
    products_count = await db.products.count_documents({})
    if products_count == 0:
        await db.products.insert_many([dict(p) for p in SEED_PRODUCTS])
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
        f"DB seeded {SEED_VERSION}. ProductCats: {await db.product_categories.count_documents({})}, "
        f"Products: {await db.products.count_documents({})}"
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
    # `windows` is the new model: dict[str, list[[start_hour, end_hour]]] keyed
    # by weekday "0".."6". If missing for a day, we synthesise from legacy
    # `open_hour` / `close_hour` / `open_days` so we stay backward-compat.
    legacy_open = s.get("open_hour", 10)
    legacy_close = s.get("close_hour", 20)
    legacy_days = s.get("open_days", [0, 1, 2, 3, 4, 5])
    legacy_window = [[legacy_open, legacy_close]]
    saved_windows = s.get("windows") or {}
    windows: dict[str, list] = {}
    for d in range(7):
        key = str(d)
        if key in saved_windows:
            windows[key] = [w for w in saved_windows[key] if w and len(w) == 2]
        else:
            windows[key] = list(legacy_window) if d in legacy_days else []
    return {
        "open_hour": legacy_open,
        "close_hour": legacy_close,
        "slot_minutes": s.get("slot_minutes", 30),
        "open_days": legacy_days,
        "windows": windows,
    }


def _slots_for_windows(windows: list, slot_minutes: int) -> list[str]:
    """Generate hh:MM AM/PM slot strings for each [start, end] window."""
    out: list[str] = []
    step = timedelta(minutes=slot_minutes)
    for w in windows or []:
        if not w or len(w) != 2:
            continue
        start_h, end_h = int(w[0]), int(w[1])
        if start_h >= end_h:
            continue
        cur = datetime(2000, 1, 1, start_h, 0)
        end = datetime(2000, 1, 1, end_h, 0) if end_h < 24 else datetime(2000, 1, 2, 0, 0)
        while cur < end:
            out.append(cur.strftime("%I:%M %p").lstrip("0"))
            cur += step
    # Deduplicate preserving order (in case windows overlap by mistake)
    seen: set = set()
    uniq: list = []
    for s in out:
        if s not in seen:
            seen.add(s)
            uniq.append(s)
    return uniq


# Reserve a slot for 10 minutes for in-progress bookings
SLOT_RESERVATION_MINUTES = 10


@api_router.get("/slots/{date_str}")
async def available_slots(date_str: str):
    """Return available slots for a date — driven by admin settings."""
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

    settings = await _get_settings()
    day_windows = settings["windows"].get(str(d.weekday())) or []
    if not day_windows:
        return {"date": date_str, "slots": [], "is_open": False, "message": "Closed on this day"}

    blocked = await db.blocked_dates.find_one({"date": date_str}, {"_id": 0})
    if blocked:
        return {
            "date": date_str,
            "slots": [],
            "is_open": False,
            "message": blocked.get("reason") or "Unavailable on this date",
        }

    all_slots = _slots_for_windows(day_windows, settings["slot_minutes"])

    # If user picked today (in IST), only keep slots that start at least
    # MIN_LEAD_MINUTES from now — so past times never appear.
    MIN_LEAD_MINUTES = 30
    ist_now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    if d == ist_now.date():
        cutoff_minutes = ist_now.hour * 60 + ist_now.minute + MIN_LEAD_MINUTES
        future_slots = []
        for slot_str in all_slots:
            slot_dt = datetime.strptime(slot_str, "%I:%M %p")
            slot_minutes_in_day = slot_dt.hour * 60 + slot_dt.minute
            if slot_minutes_in_day >= cutoff_minutes:
                future_slots.append(slot_str)
        all_slots = future_slots

    # Block: paid bookings + pending bookings from the last RESERVATION minutes
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=SLOT_RESERVATION_MINUTES)).isoformat()
    booked = await db.bookings.find(
        {
            "booking_date": date_str,
            "$or": [
                {"payment_status": "paid"},
                {"payment_status": "pending", "created_at": {"$gte": cutoff}},
            ],
        },
        {"_id": 0, "booking_slot": 1},
    ).to_list(length=300)
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
    base_inr = int(service["price_inr"])

    # Apply auto + coupon discount
    discount_inr = 0
    applied_promo = None
    code = (payload.coupon_code or "").strip().upper()
    if code:
        promo = await db.promotions.find_one({"code": code}, {"_id": 0})
        if promo and _is_promo_live(promo) and _scope_matches(promo, "services", payload.service_id) \
           and base_inr >= (promo.get("min_order_inr") or 0):
            discount_inr = _apply_discount(promo, base_inr)
            applied_promo = promo
    if not applied_promo:
        # Auto-applied promo (no code, active, banner or not) — pick highest applicable
        autos = await db.promotions.find(
            {"$or": [{"code": ""}, {"code": None}], "active": True}, {"_id": 0}
        ).to_list(length=50)
        best_disc = 0
        best_promo = None
        for p in autos:
            if not _is_promo_live(p):
                continue
            if not _scope_matches(p, "services", payload.service_id):
                continue
            if base_inr < (p.get("min_order_inr") or 0):
                continue
            d = _apply_discount(p, base_inr)
            if d > best_disc:
                best_disc = d
                best_promo = p
        if best_promo:
            discount_inr = best_disc
            applied_promo = best_promo

    final_inr = max(0, base_inr - discount_inr)
    amount_paise = final_inr * 100

    if USE_MOCK_PAYMENT or razorpay_client is None:
        razorpay_order_id = f"order_mock_{uuid.uuid4().hex[:14]}"
        is_mock = True
    else:
        try:
            order = await asyncio.to_thread(
                razorpay_client.order.create,
                {
                    "amount": amount_paise,
                    "currency": "INR",
                    "receipt": booking_id[:40],
                    "payment_capture": 1,
                },
            )
            razorpay_order_id = order["id"]
            is_mock = False
        except Exception as e:
            logger.error(f"Razorpay order creation failed: {e}")
            raise HTTPException(status_code=502, detail="Payment provider error")

    booking_doc = {
        "id": booking_id,
        "service_id": service["id"],
        "service_name": service["name"] + (f" ({service['duration_minutes']} min)" if service.get("duration_minutes") else ""),
        "service_price_inr": base_inr,
        "discount_inr": discount_inr,
        "final_price_inr": final_inr,
        "applied_coupon_code": (applied_promo or {}).get("code") or None,
        "applied_promo_id": (applied_promo or {}).get("id") or None,
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

    # Always alert admin that someone attempted a booking — fires even if the
    # customer abandons the Razorpay modal or the verify-payment never lands.
    async def _notify_admin_attempt():
        try:
            from email_service import send_booking_attempt_alert
            await send_booking_attempt_alert(booking_doc)
        except Exception as e:
            logger.warning(f"Admin attempt alert failed: {e}")

    asyncio.create_task(_notify_admin_attempt())

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

    updated = await _finalize_booking_payment(payload.booking_id, payload.razorpay_payment_id)
    return {"success": True, "booking": updated, "is_mock": is_mock}


def _verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """HMAC-SHA256 check used for Razorpay client-side checkout signatures."""
    if not signature:
        return False
    body = f"{order_id}|{payment_id}"
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        body.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def _finalize_booking_payment(booking_id: str, razorpay_payment_id: str):
    """Idempotent: marks the booking paid, bumps promo uses, fires emails/WA in BG.

    Used by /bookings/verify-payment, /bookings/payment-callback (mobile redirect)
    and /razorpay/webhook (out-of-band reconciliation).
    """
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        return None
    if booking.get("payment_status") == "paid":
        return booking  # already finalized — no-op (idempotent)

    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "razorpay_payment_id": razorpay_payment_id,
            "payment_status": "paid",
            "booking_status": "confirmed",
        }},
    )
    updated = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if updated.get("applied_promo_id"):
        await db.promotions.update_one(
            {"id": updated["applied_promo_id"]}, {"$inc": {"uses": 1}}
        )

    async def _notify(bid: str, doc: dict):
        try:
            email_id = await send_booking_confirmation(doc)
            if email_id:
                await db.bookings.update_one(
                    {"id": bid}, {"$set": {"confirmation_email_id": email_id}}
                )
        except Exception as e:
            logger.warning(f"Booking email send failed (background): {e}")
        try:
            wa_id = await send_booking_whatsapp(doc)
            if wa_id:
                await db.bookings.update_one(
                    {"id": bid}, {"$set": {"confirmation_whatsapp_id": wa_id}}
                )
        except Exception as e:
            logger.warning(f"Booking WhatsApp failed (background): {e}")

    asyncio.create_task(_notify(booking_id, updated))
    return updated


async def _finalize_order_payment(order_id: str, razorpay_payment_id: str):
    """Idempotent shop-order finalize counterpart of `_finalize_booking_payment`."""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        return None
    if order.get("payment_status") == "paid":
        return order

    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "razorpay_payment_id": razorpay_payment_id,
            "payment_status": "paid",
            "order_status": "confirmed",
        }},
    )
    updated = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if updated.get("applied_promo_id"):
        await db.promotions.update_one(
            {"id": updated["applied_promo_id"]}, {"$inc": {"uses": 1}}
        )

    async def _notify(oid: str, doc: dict):
        try:
            await send_order_confirmation(doc)
        except Exception as e:
            logger.warning(f"Order email failed (background): {e}")
        try:
            wa_id = await send_order_whatsapp(doc)
            if wa_id:
                await db.orders.update_one(
                    {"id": oid}, {"$set": {"confirmation_whatsapp_id": wa_id}}
                )
        except Exception as e:
            logger.warning(f"Order WhatsApp failed (background): {e}")

    asyncio.create_task(_notify(order_id, updated))
    return updated


def _redirect_to_spa(kind: str, local_id: str, status: str, reason: str = ""):
    """303-redirect the user from a backend POST callback back to the SPA.

    When FRONTEND_URL is set we use an absolute URL; otherwise we issue a
    relative redirect, which works whenever the SPA is served from the same
    origin as the API (Emergent ingress, custom domains via the same proxy).
    """
    base = FRONTEND_URL or ""
    qs = f"kind={kind}&id={local_id}&status={status}"
    if reason:
        qs += f"&reason={reason}"
    return RedirectResponse(url=f"{base}/payment-success?{qs}", status_code=303)


@api_router.post("/bookings/payment-callback")
async def bookings_payment_callback(request: Request):
    """Razorpay 'redirect mode' lands here via a server POST after checkout.

    Razorpay submits a `application/x-www-form-urlencoded` body containing
    `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`. We verify
    the signature, finalize the booking, then 303-redirect the user back to
    the SPA so they see the friendly confirmation page.
    """
    form = await request.form()
    booking_id = request.query_params.get("booking_id") or form.get("booking_id") or ""
    rzp_order_id = form.get("razorpay_order_id") or ""
    rzp_payment_id = form.get("razorpay_payment_id") or ""
    rzp_signature = form.get("razorpay_signature") or ""

    if not booking_id or not rzp_order_id:
        return _redirect_to_spa("booking", booking_id, "error", "missing-params")

    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        return _redirect_to_spa("booking", booking_id, "error", "not-found")
    if booking.get("razorpay_order_id") != rzp_order_id:
        return _redirect_to_spa("booking", booking_id, "error", "order-mismatch")

    is_mock = booking.get("is_mock_payment", False) or USE_MOCK_PAYMENT
    if not is_mock and not _verify_razorpay_signature(rzp_order_id, rzp_payment_id, rzp_signature):
        await db.bookings.update_one(
            {"id": booking_id}, {"$set": {"payment_status": "failed"}}
        )
        return _redirect_to_spa("booking", booking_id, "failed", "bad-signature")

    await _finalize_booking_payment(booking_id, rzp_payment_id)
    return _redirect_to_spa("booking", booking_id, "ok")


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


# --- Admin: manual create + delete booking ---
class AdminBookingCreate(BaseModel):
    service_id: str
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    booking_date: Optional[str] = None
    booking_slot: Optional[str] = None
    question: Optional[str] = None
    notes: Optional[str] = None
    booking_status: str = "confirmed"  # admin-created defaults to confirmed
    payment_status: str = "paid"  # treat as already collected (offline)
    service_price_inr: Optional[int] = None  # override price if needed


@api_router.post("/admin/bookings")
async def admin_create_booking(
    payload: AdminBookingCreate, _admin: str = Depends(verify_admin)
):
    """Manually add a booking (e.g. cash payment, bookings taken on call)."""
    service = await db.services.find_one({"id": payload.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    booking_id = str(uuid.uuid4())
    booking = {
        "id": booking_id,
        "service_id": payload.service_id,
        "service_name": service["name"],
        "service_price_inr": payload.service_price_inr or service["price_inr"],
        "customer_name": payload.customer_name,
        "customer_email": payload.customer_email,
        "customer_phone": payload.customer_phone,
        "booking_date": payload.booking_date,
        "booking_slot": payload.booking_slot,
        "question": payload.question,
        "notes": payload.notes,
        "razorpay_order_id": None,
        "razorpay_payment_id": None,
        "payment_status": payload.payment_status,
        "booking_status": payload.booking_status,
        "is_mock_payment": False,
        "is_admin_created": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(booking)
    booking.pop("_id", None)
    return {"success": True, "booking": booking}


@api_router.delete("/admin/bookings/{booking_id}")
async def admin_delete_booking(
    booking_id: str, _admin: str = Depends(verify_admin)
):
    res = await db.bookings.delete_one({"id": booking_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"success": True, "removed": res.deleted_count}


# --- CSV exports ---
def _csv_response(rows: List[List], headers: List[str], filename: str):
    import csv
    import io
    from fastapi.responses import StreamingResponse

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers)
    for r in rows:
        writer.writerow(r)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@api_router.get("/admin/bookings/export")
async def admin_export_bookings(_admin: str = Depends(verify_admin)):
    docs = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=5000)
    headers = [
        "Booking ID", "Created", "Customer", "Email", "Phone",
        "Service", "Date", "Slot",
        "Amount (INR)", "Payment Status", "Booking Status",
        "Razorpay Order", "Razorpay Payment", "Question", "Notes", "Source",
    ]
    rows = [
        [
            b.get("id"),
            b.get("created_at"),
            b.get("customer_name"),
            b.get("customer_email"),
            b.get("customer_phone"),
            b.get("service_name"),
            b.get("booking_date") or "",
            b.get("booking_slot") or "",
            b.get("service_price_inr"),
            b.get("payment_status"),
            b.get("booking_status"),
            b.get("razorpay_order_id") or "",
            b.get("razorpay_payment_id") or "",
            (b.get("question") or "").replace("\n", " "),
            (b.get("notes") or "").replace("\n", " "),
            "admin" if b.get("is_admin_created") else "site",
        ]
        for b in docs
    ]
    fname = f"bookings_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return _csv_response(rows, headers, fname)


@api_router.get("/admin/orders/export")
async def admin_export_orders(_admin: str = Depends(verify_admin)):
    docs = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=5000)
    headers = [
        "Order ID", "Created", "Customer", "Email", "Phone",
        "Items", "Total (INR)", "Payment Status", "Order Status",
        "Address", "Razorpay Order", "Razorpay Payment", "Notes",
    ]
    rows = []
    for o in docs:
        items_str = "; ".join(
            f"{(it.get('product_name') or '?')} x{it.get('quantity', 1)} (₹{it.get('line_total_inr', 0)})"
            for it in (o.get("items") or [])
        )
        addr = o.get("address") or {}
        addr_str = ", ".join(
            filter(None, [
                addr.get("line1"), addr.get("line2"),
                addr.get("city"), addr.get("state"),
                addr.get("postal_code"), addr.get("country"),
            ])
        )
        rows.append([
            o.get("id"),
            o.get("created_at"),
            o.get("customer_name"),
            o.get("customer_email"),
            o.get("customer_phone"),
            items_str,
            o.get("total_inr"),
            o.get("payment_status"),
            o.get("order_status"),
            addr_str,
            o.get("razorpay_order_id") or "",
            o.get("razorpay_payment_id") or "",
            (o.get("notes") or "").replace("\n", " "),
        ])
    fname = f"orders_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return _csv_response(rows, headers, fname)


@api_router.get("/admin/stats")
async def admin_stats(
    period: str = "all",
    _admin: str = Depends(verify_admin),
):
    """Combined stats for the dashboard.
    period = "week" | "month" | "year" | "all"
    """
    # Compute since-cutoff based on requested period
    now = datetime.now(timezone.utc)
    cutoff_iso: Optional[str] = None
    if period == "week":
        cutoff_iso = (now - timedelta(days=7)).isoformat()
    elif period == "month":
        cutoff_iso = (now - timedelta(days=30)).isoformat()
    elif period == "year":
        cutoff_iso = (now - timedelta(days=365)).isoformat()

    # ----- Bookings -----
    bk_match: dict = {}
    if cutoff_iso:
        bk_match["created_at"] = {"$gte": cutoff_iso}
    total_bookings = await db.bookings.count_documents(bk_match)
    paid_bk = await db.bookings.count_documents({**bk_match, "payment_status": "paid"})
    pending_bk = await db.bookings.count_documents({**bk_match, "payment_status": "pending"})
    # Use final_price_inr if present, else fallback to service_price_inr
    bk_pipeline = [
        {"$match": {**bk_match, "payment_status": "paid"}},
        {"$group": {
            "_id": None,
            "revenue": {"$sum": {"$ifNull": ["$final_price_inr", "$service_price_inr"]}},
            "discount_total": {"$sum": {"$ifNull": ["$discount_inr", 0]}},
        }},
    ]
    bk_doc = await db.bookings.aggregate(bk_pipeline).to_list(length=1)
    bk_revenue = bk_doc[0]["revenue"] if bk_doc else 0
    bk_discount = bk_doc[0]["discount_total"] if bk_doc else 0

    # ----- Orders (Shop) -----
    od_match: dict = {}
    if cutoff_iso:
        od_match["created_at"] = {"$gte": cutoff_iso}
    total_orders = await db.orders.count_documents(od_match)
    paid_od = await db.orders.count_documents({**od_match, "payment_status": "paid"})
    pending_od = await db.orders.count_documents({**od_match, "payment_status": "pending"})
    od_pipeline = [
        {"$match": {**od_match, "payment_status": "paid"}},
        {"$group": {
            "_id": None,
            "revenue": {"$sum": "$total_inr"},
            "discount_total": {"$sum": {"$ifNull": ["$discount_inr", 0]}},
        }},
    ]
    od_doc = await db.orders.aggregate(od_pipeline).to_list(length=1)
    od_revenue = od_doc[0]["revenue"] if od_doc else 0
    od_discount = od_doc[0]["discount_total"] if od_doc else 0

    return {
        "period": period,
        # legacy keys for any older UI
        "total_bookings": total_bookings,
        "paid": paid_bk,
        "pending": pending_bk,
        "revenue_inr": bk_revenue + od_revenue,  # COMBINED total at top
        # detailed split
        "bookings": {
            "total": total_bookings,
            "paid": paid_bk,
            "pending": pending_bk,
            "revenue_inr": bk_revenue,
            "discount_inr": bk_discount,
        },
        "orders": {
            "total": total_orders,
            "paid": paid_od,
            "pending": pending_od,
            "revenue_inr": od_revenue,
            "discount_inr": od_discount,
        },
        "combined_revenue_inr": bk_revenue + od_revenue,
        "combined_discount_inr": bk_discount + od_discount,
    }


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
    # Legacy single-window fields kept for backward-compat with older UI
    open_hour: int = 10
    close_hour: int = 20
    slot_minutes: int = 30
    open_days: List[int] = [0, 1, 2, 3, 4, 5]
    # New multi-window model: keyed by weekday "0".."6", each is a list of
    # [start_hour, end_hour] tuples in 24h format, e.g. {"1": [[12,14],[17,19]]}.
    windows: Optional[Dict[str, List[List[int]]]] = None


@api_router.get("/admin/settings")
async def admin_get_settings(_admin: str = Depends(verify_admin)):
    return await _get_settings()


@api_router.put("/admin/settings")
async def admin_update_settings(
    payload: Settings, _admin: str = Depends(verify_admin)
):
    if payload.slot_minutes not in (15, 20, 30, 45, 60, 90, 120):
        raise HTTPException(status_code=400, detail="Slot minutes must be 15/20/30/45/60/90/120")

    # Validate windows when provided. Accept missing days too (treated as closed).
    cleaned_windows: Dict[str, List[List[int]]] = {}
    if payload.windows is not None:
        for day_key, wins in payload.windows.items():
            if day_key not in {"0", "1", "2", "3", "4", "5", "6"}:
                raise HTTPException(status_code=400, detail=f"Bad day key: {day_key}")
            day_clean: List[List[int]] = []
            for w in wins or []:
                if not isinstance(w, (list, tuple)) or len(w) != 2:
                    raise HTTPException(status_code=400, detail="Window must be [start,end]")
                start_h, end_h = int(w[0]), int(w[1])
                if not (0 <= start_h < 24) or not (0 < end_h <= 24):
                    raise HTTPException(status_code=400, detail="Window hours must be in 0–24")
                if start_h >= end_h:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Window start ({start_h}) must be before end ({end_h})",
                    )
                day_clean.append([start_h, end_h])
            cleaned_windows[day_key] = day_clean
    else:
        # No windows posted — synthesise from legacy fields so DB stays consistent.
        if not (0 <= payload.open_hour < 24) or not (0 < payload.close_hour <= 24):
            raise HTTPException(status_code=400, detail="Hours must be in 0–24 range")
        if payload.open_hour >= payload.close_hour:
            raise HTTPException(
                status_code=400, detail="open_hour must be before close_hour"
            )
        legacy = [[payload.open_hour, payload.close_hour]]
        for d in range(7):
            cleaned_windows[str(d)] = list(legacy) if d in payload.open_days else []

    # Derive sensible legacy values from the first non-empty window so older
    # callers still get reasonable open_hour/close_hour/open_days.
    derived_open_days = [d for d in range(7) if cleaned_windows.get(str(d))]
    first_day_with_window = next(
        (cleaned_windows[str(d)] for d in derived_open_days),
        [[10, 20]],
    )
    derived_open_hour = min(w[0] for w in first_day_with_window)
    derived_close_hour = max(w[1] for w in first_day_with_window)

    doc = {
        "open_hour": derived_open_hour,
        "close_hour": derived_close_hour,
        "slot_minutes": payload.slot_minutes,
        "open_days": derived_open_days,
        "windows": cleaned_windows,
    }
    await db.settings.update_one(
        {"_id": "main"},
        {"$set": doc},
        upsert=True,
    )
    return {"success": True, **doc}


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
class ProductCategoryIn(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    accent: Optional[str] = "from-[#C8B6E2] to-[#E6DDF1]"
    icon: Optional[str] = "sparkles"
    order: int = 100


class ProductIn(BaseModel):
    id: str
    name: str
    blurb: str = ""
    price_inr: Optional[int] = None
    badge: Optional[str] = None
    image_url: Optional[str] = None  # external URL OR data: URI for primary image (back-compat)
    images: List[str] = []  # gallery — up to 5 images (data URIs or URLs); first is primary
    accent: Optional[str] = "from-[#C8B6E2] to-[#E6DDF1]"
    shop_url: Optional[str] = None
    in_stock: bool = True
    order: int = 100
    product_category_id: Optional[str] = None  # link to product_categories
    tags: List[str] = []  # free-form labels e.g. ["money", "love"]


class ProductImageUpload(BaseModel):
    image_data: str


MAX_PRODUCT_IMAGES = 5


def _slugify_tag(t: str) -> str:
    """Normalize a tag to lowercase slug — letters/digits/hyphens only."""
    if not t:
        return ""
    s = t.strip().lower()
    out = []
    for ch in s:
        if ch.isalnum():
            out.append(ch)
        elif ch in (" ", "-", "_", "/"):
            out.append("-")
    slug = "".join(out)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def _normalize_product_images(doc: dict) -> dict:
    """Mutates `doc` so that `images` is the source of truth (up to 5) and
    `image_url` always mirrors the primary (`images[0]`) for back-compat
    with older shop frontends. Also normalises tags."""
    imgs = doc.get("images") or []
    if not imgs and doc.get("image_url"):
        imgs = [doc["image_url"]]
    imgs = [i for i in imgs if i][:MAX_PRODUCT_IMAGES]
    doc["images"] = imgs
    doc["image_url"] = imgs[0] if imgs else None
    raw_tags = doc.get("tags") or []
    seen_tags: set = set()
    clean_tags: list = []
    for t in raw_tags:
        slug = _slugify_tag(str(t))
        if slug and slug not in seen_tags:
            seen_tags.add(slug)
            clean_tags.append(slug)
    doc["tags"] = clean_tags
    return doc


# ----- Public product category endpoints -----
@api_router.get("/product-categories")
async def public_list_product_categories():
    """Return product categories with their nested products (for the Shop page)."""
    cats = await db.product_categories.find({}, {"_id": 0}).sort("order", 1).to_list(length=50)
    products = await db.products.find({}, {"_id": 0}).sort("order", 1).to_list(length=500)
    products = [_normalize_product_images(p) for p in products]
    by_cat: dict[str, list] = {None: []}
    for p in products:
        by_cat.setdefault(p.get("product_category_id"), []).append(p)
    for c in cats:
        c["products"] = by_cat.get(c["id"], [])
    # Append uncategorised under a virtual bucket
    uncategorised = by_cat.get(None, []) + [
        p for k, lst in by_cat.items() if k and k not in {c["id"] for c in cats} for p in lst
    ]
    if uncategorised:
        cats.append({
            "id": "_uncategorised",
            "name": "More",
            "description": "",
            "accent": "from-[#9B8AC4] to-[#C8B6E2]",
            "icon": "sparkles",
            "order": 9999,
            "products": uncategorised,
        })
    return cats


# ----- Admin product category CRUD -----
@api_router.get("/admin/product-categories")
async def admin_list_product_categories(_admin: str = Depends(verify_admin)):
    docs = await db.product_categories.find({}, {"_id": 0}).sort("order", 1).to_list(length=100)
    return docs


@api_router.post("/admin/product-categories")
async def admin_create_product_category(
    payload: ProductCategoryIn, _admin: str = Depends(verify_admin)
):
    if await db.product_categories.find_one({"id": payload.id}):
        raise HTTPException(status_code=409, detail="Category id already exists")
    await db.product_categories.insert_one(payload.model_dump())
    return {"success": True}


@api_router.put("/admin/product-categories/{cid}")
async def admin_update_product_category(
    cid: str, payload: ProductCategoryIn, _admin: str = Depends(verify_admin)
):
    res = await db.product_categories.update_one(
        {"id": cid}, {"$set": payload.model_dump()}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"success": True}


@api_router.delete("/admin/product-categories/{cid}")
async def admin_delete_product_category(cid: str, _admin: str = Depends(verify_admin)):
    # Detach products instead of deleting them
    await db.products.update_many(
        {"product_category_id": cid}, {"$set": {"product_category_id": None}}
    )
    res = await db.product_categories.delete_one({"id": cid})
    return {"success": True, "removed": res.deleted_count}


@api_router.get("/products")
async def public_list_products():
    docs = await db.products.find({}, {"_id": 0}).sort("order", 1).to_list(length=200)
    return [_normalize_product_images(d) for d in docs]


@api_router.get("/tags")
async def public_list_tags():
    """Return distinct product tags with counts so the public shop can render
    filter chips (e.g. money, love, protection)."""
    docs = await db.products.find({}, {"_id": 0, "tags": 1}).to_list(length=500)
    counts: dict[str, int] = {}
    for d in docs:
        for t in d.get("tags") or []:
            slug = _slugify_tag(str(t))
            if slug:
                counts[slug] = counts.get(slug, 0) + 1
    return [
        {"slug": slug, "count": cnt}
        for slug, cnt in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    ]


@api_router.get("/admin/products")
async def admin_list_products(_admin: str = Depends(verify_admin)):
    docs = await db.products.find({}, {"_id": 0}).sort("order", 1).to_list(length=500)
    return [_normalize_product_images(d) for d in docs]


@api_router.post("/admin/products")
async def admin_create_product(payload: ProductIn, _admin: str = Depends(verify_admin)):
    if await db.products.find_one({"id": payload.id}):
        raise HTTPException(status_code=409, detail="Product id already exists")
    doc = _normalize_product_images(payload.model_dump())
    await db.products.insert_one(doc)
    return {"success": True}


@api_router.put("/admin/products/{pid}")
async def admin_update_product(pid: str, payload: ProductIn, _admin: str = Depends(verify_admin)):
    doc = _normalize_product_images(payload.model_dump())
    res = await db.products.update_one({"id": pid}, {"$set": doc})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True}


@api_router.delete("/admin/products/{pid}")
async def admin_delete_product(pid: str, _admin: str = Depends(verify_admin)):
    res = await db.products.delete_one({"id": pid})
    return {"success": True, "removed": res.deleted_count}


@api_router.post("/admin/products/{pid}/image")
async def admin_upload_product_image(
    pid: str,
    payload: ProductImageUpload,
    _admin: str = Depends(verify_admin),
):
    """Append an image to the product's gallery (max 5)."""
    data = (payload.image_data or "").strip()
    if not data:
        raise HTTPException(status_code=400, detail="image_data is empty")
    if not data.startswith("data:"):
        data = f"data:image/jpeg;base64,{data}"
    if len(data) > 8_500_000:
        raise HTTPException(status_code=413, detail="Image too large (max ~6 MB). Compress first.")
    product = await db.products.find_one({"id": pid}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    images = product.get("images") or ([product["image_url"]] if product.get("image_url") else [])
    if len(images) >= MAX_PRODUCT_IMAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_PRODUCT_IMAGES} images allowed. Remove one first.",
        )
    images.append(data)
    await db.products.update_one(
        {"id": pid},
        {"$set": {"images": images, "image_url": images[0]}},
    )
    return {"success": True, "images": images, "count": len(images)}


class ProductImageDelete(BaseModel):
    index: int


@api_router.delete("/admin/products/{pid}/image/{index}")
async def admin_delete_product_image(
    pid: str,
    index: int,
    _admin: str = Depends(verify_admin),
):
    """Remove a single image from the gallery by zero-based index."""
    product = await db.products.find_one({"id": pid}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    images = product.get("images") or ([product["image_url"]] if product.get("image_url") else [])
    if index < 0 or index >= len(images):
        raise HTTPException(status_code=400, detail="Invalid image index")
    images.pop(index)
    await db.products.update_one(
        {"id": pid},
        {"$set": {"images": images, "image_url": images[0] if images else None}},
    )
    return {"success": True, "images": images, "count": len(images)}


# ============== Orders (e-commerce) ==============
class ShippingAddress(BaseModel):
    line1: str
    line2: Optional[str] = ""
    city: str
    state: str
    postal_code: str
    country: str = "India"


class OrderItemIn(BaseModel):
    product_id: str
    quantity: int = 1


class OrderCreate(BaseModel):
    items: List[OrderItemIn]
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    address: ShippingAddress
    notes: Optional[str] = ""
    coupon_code: Optional[str] = None


class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price_inr: int
    line_total_inr: int


class OrderVerify(BaseModel):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    order_status: str  # pending | confirmed | shipped | delivered | cancelled


@api_router.post("/orders/create-order")
async def orders_create(payload: OrderCreate):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    items: List[dict] = []
    subtotal_inr = 0
    for it in payload.items:
        product = await db.products.find_one({"id": it.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product not found: {it.product_id}")
        if not product.get("price_inr"):
            raise HTTPException(status_code=400, detail=f"Product {product['name']} has no price set")
        if not product.get("in_stock", True):
            raise HTTPException(status_code=400, detail=f"Product {product['name']} is out of stock")
        qty = max(1, int(it.quantity))
        unit = int(product["price_inr"])
        line_total = unit * qty
        subtotal_inr += line_total
        items.append({
            "product_id": product["id"],
            "product_name": product["name"],
            "quantity": qty,
            "unit_price_inr": unit,
            "line_total_inr": line_total,
        })

    # Apply discount
    discount_inr = 0
    applied_promo = None
    code = (payload.coupon_code or "").strip().upper()
    if code:
        promo = await db.promotions.find_one({"code": code}, {"_id": 0})
        if promo and _is_promo_live(promo) and _scope_matches(promo, "products") \
           and subtotal_inr >= (promo.get("min_order_inr") or 0):
            discount_inr = _apply_discount(promo, subtotal_inr)
            applied_promo = promo
    if not applied_promo:
        autos = await db.promotions.find(
            {"$or": [{"code": ""}, {"code": None}], "active": True}, {"_id": 0}
        ).to_list(length=50)
        best_disc = 0
        best_promo = None
        for p in autos:
            if not _is_promo_live(p):
                continue
            if not _scope_matches(p, "products"):
                continue
            if subtotal_inr < (p.get("min_order_inr") or 0):
                continue
            d = _apply_discount(p, subtotal_inr)
            if d > best_disc:
                best_disc = d
                best_promo = p
        if best_promo:
            discount_inr = best_disc
            applied_promo = best_promo

    final_inr = max(0, subtotal_inr - discount_inr)
    total_paise = final_inr * 100

    order_id = str(uuid.uuid4())
    if USE_MOCK_PAYMENT or razorpay_client is None:
        rzp_order_id = f"order_mock_{uuid.uuid4().hex[:14]}"
        is_mock = True
    else:
        try:
            order = await asyncio.to_thread(
                razorpay_client.order.create,
                {
                    "amount": total_paise,
                    "currency": "INR",
                    "receipt": order_id[:40],
                    "payment_capture": 1,
                },
            )
            rzp_order_id = order["id"]
            is_mock = False
        except Exception as e:
            logger.error(f"Razorpay order creation failed: {e}")
            raise HTTPException(status_code=502, detail="Payment provider error")

    doc = {
        "id": order_id,
        "items": items,
        "subtotal_inr": subtotal_inr,
        "discount_inr": discount_inr,
        "total_inr": final_inr,
        "applied_coupon_code": (applied_promo or {}).get("code") or None,
        "applied_promo_id": (applied_promo or {}).get("id") or None,
        "customer_name": payload.customer_name,
        "customer_email": payload.customer_email,
        "customer_phone": payload.customer_phone,
        "address": payload.address.model_dump(),
        "notes": payload.notes or "",
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": None,
        "payment_status": "pending",
        "order_status": "pending",
        "is_mock_payment": is_mock,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(doc)

    # Notify admin of the attempt (fires even if customer abandons checkout)
    async def _notify_admin_order_attempt():
        try:
            from email_service import send_order_attempt_alert
            await send_order_attempt_alert(doc)
        except Exception as e:
            logger.warning(f"Admin order-attempt alert failed: {e}")

    asyncio.create_task(_notify_admin_order_attempt())

    return {
        "order_id": order_id,
        "razorpay_order_id": rzp_order_id,
        "razorpay_key_id": RAZORPAY_KEY_ID,
        "amount_paise": total_paise,
        "currency": "INR",
        "is_mock": is_mock,
        "subtotal_inr": subtotal_inr,
        "discount_inr": discount_inr,
        "final_inr": final_inr,
        "applied_coupon_code": (applied_promo or {}).get("code"),
    }


@api_router.post("/orders/verify-payment")
async def orders_verify(payload: OrderVerify):
    order = await db.orders.find_one({"id": payload.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["razorpay_order_id"] != payload.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Order ID mismatch")

    is_mock = order.get("is_mock_payment", False) or USE_MOCK_PAYMENT
    if not is_mock:
        if not _verify_razorpay_signature(
            payload.razorpay_order_id,
            payload.razorpay_payment_id,
            payload.razorpay_signature or "",
        ):
            await db.orders.update_one(
                {"id": payload.order_id},
                {"$set": {"payment_status": "failed"}},
            )
            raise HTTPException(status_code=400, detail="Signature verification failed")

    updated = await _finalize_order_payment(payload.order_id, payload.razorpay_payment_id)
    return {"success": True, "order": updated, "is_mock": is_mock}


@api_router.post("/orders/payment-callback")
async def orders_payment_callback(request: Request):
    """Razorpay 'redirect mode' callback for shop orders. See booking variant."""
    form = await request.form()
    order_id = request.query_params.get("order_id") or form.get("order_id") or ""
    rzp_order_id = form.get("razorpay_order_id") or ""
    rzp_payment_id = form.get("razorpay_payment_id") or ""
    rzp_signature = form.get("razorpay_signature") or ""

    if not order_id or not rzp_order_id:
        return _redirect_to_spa("order", order_id, "error", "missing-params")

    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        return _redirect_to_spa("order", order_id, "error", "not-found")
    if order.get("razorpay_order_id") != rzp_order_id:
        return _redirect_to_spa("order", order_id, "error", "order-mismatch")

    is_mock = order.get("is_mock_payment", False) or USE_MOCK_PAYMENT
    if not is_mock and not _verify_razorpay_signature(rzp_order_id, rzp_payment_id, rzp_signature):
        await db.orders.update_one(
            {"id": order_id}, {"$set": {"payment_status": "failed"}}
        )
        return _redirect_to_spa("order", order_id, "failed", "bad-signature")

    await _finalize_order_payment(order_id, rzp_payment_id)
    return _redirect_to_spa("order", order_id, "ok")


@api_router.post("/razorpay/webhook")
async def razorpay_webhook(request: Request):
    """Out-of-band reconciliation. Razorpay POSTs `payment.captured` / `.authorized`
    events and we mirror them onto our local DB. Idempotent — the underlying
    finalize helpers no-op when the booking/order is already `paid`.

    Configure in Razorpay Dashboard → Webhooks. Set RAZORPAY_WEBHOOK_SECRET in
    the backend env. Subscribe at minimum to `payment.captured`.
    """
    body_bytes = await request.body()
    sig = request.headers.get("x-razorpay-signature", "")

    if not RAZORPAY_WEBHOOK_SECRET:
        # Don't 500 — just log so Razorpay's retries don't pile up before the
        # user has configured the secret in their env.
        logger.warning("RAZORPAY_WEBHOOK_SECRET not configured; ignoring webhook")
        return {"ok": False, "reason": "not-configured"}

    expected = hmac.new(
        RAZORPAY_WEBHOOK_SECRET.encode(), body_bytes, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        payload = json.loads(body_bytes)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = payload.get("event", "")
    if event not in ("payment.captured", "payment.authorized"):
        return {"ok": True, "ignored": event}

    payment = (
        payload.get("payload", {}).get("payment", {}).get("entity", {}) or {}
    )
    rzp_order_id = payment.get("order_id")
    rzp_payment_id = payment.get("id")
    if not rzp_order_id or not rzp_payment_id:
        return {"ok": True, "ignored": "missing-ids"}

    booking = await db.bookings.find_one(
        {"razorpay_order_id": rzp_order_id}, {"_id": 0}
    )
    if booking:
        await _finalize_booking_payment(booking["id"], rzp_payment_id)
        return {"ok": True, "kind": "booking", "id": booking["id"]}

    order = await db.orders.find_one(
        {"razorpay_order_id": rzp_order_id}, {"_id": 0}
    )
    if order:
        await _finalize_order_payment(order["id"], rzp_payment_id)
        return {"ok": True, "kind": "order", "id": order["id"]}

    logger.info(f"Webhook received for unknown rzp order {rzp_order_id}")
    return {"ok": True, "ignored": "unknown-order"}


@api_router.get("/admin/orders")
async def admin_list_orders(_admin: str = Depends(verify_admin)):
    docs = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=1000)
    return docs


@api_router.patch("/admin/orders/{oid}")
async def admin_update_order(
    oid: str,
    payload: OrderStatusUpdate,
    _admin: str = Depends(verify_admin),
):
    allowed = {"pending", "confirmed", "shipped", "delivered", "cancelled"}
    if payload.order_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {allowed}")
    res = await db.orders.update_one(
        {"id": oid}, {"$set": {"order_status": payload.order_status}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"success": True, "order_status": payload.order_status}


@api_router.delete("/admin/orders/{oid}")
async def admin_delete_order(oid: str, _admin: str = Depends(verify_admin)):
    res = await db.orders.delete_one({"id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"success": True, "removed": res.deleted_count}


# ============== Promotions / Coupons ==============
class PromotionIn(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    code: Optional[str] = ""  # blank = auto-applied (no code needed)
    discount_type: str = "percent"  # percent | flat
    discount_value: float = 0
    scope: str = "site_wide"  # site_wide | products_only | services_only | specific
    target_ids: List[str] = []  # used when scope=specific
    min_order_inr: int = 0
    max_uses: int = 0  # 0 = unlimited
    uses: int = 0
    active: bool = True
    show_banner: bool = True
    banner_text: Optional[str] = ""  # custom banner copy; falls back to title
    starts_at: Optional[str] = None  # ISO date or datetime
    ends_at: Optional[str] = None


def _is_promo_live(promo: dict) -> bool:
    if not promo.get("active"):
        return False
    if promo.get("max_uses") and promo.get("uses", 0) >= promo["max_uses"]:
        return False
    now = datetime.now(timezone.utc)
    starts = promo.get("starts_at")
    ends = promo.get("ends_at")
    try:
        if starts and datetime.fromisoformat(starts.replace("Z", "+00:00")) > now:
            return False
        if ends and datetime.fromisoformat(ends.replace("Z", "+00:00")) < now:
            return False
    except Exception:
        pass
    return True


def _scope_matches(promo: dict, kind: str, target_id: Optional[str] = None) -> bool:
    """kind: 'products' | 'services' | 'category-id' | 'product-id'."""
    scope = promo.get("scope", "site_wide")
    if scope == "site_wide":
        return True
    if scope == "products_only" and kind == "products":
        return True
    if scope == "services_only" and kind == "services":
        return True
    if scope == "specific" and target_id and target_id in (promo.get("target_ids") or []):
        return True
    return False


def _apply_discount(promo: dict, base_inr: int) -> int:
    """Return the discount amount (positive int) for a base in INR."""
    dtype = promo.get("discount_type", "percent")
    val = float(promo.get("discount_value") or 0)
    if dtype == "percent":
        return int(round(base_inr * val / 100))
    return min(base_inr, int(val))


@api_router.get("/promotions/active")
async def public_active_promotions():
    """Return active, banner-enabled promotions for the site banner."""
    docs = await db.promotions.find({"active": True, "show_banner": True}, {"_id": 0}).to_list(length=20)
    live = [p for p in docs if _is_promo_live(p)]
    return live


class CouponValidateIn(BaseModel):
    code: str
    kind: str = "services"  # services | products
    base_inr: int
    target_id: Optional[str] = None


@api_router.post("/promotions/validate")
async def public_validate_coupon(payload: CouponValidateIn):
    code = (payload.code or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Coupon code is required")
    promo = await db.promotions.find_one({"code": code}, {"_id": 0})
    if not promo:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    if not _is_promo_live(promo):
        raise HTTPException(status_code=400, detail="This coupon is not active")
    if not _scope_matches(promo, payload.kind, payload.target_id):
        raise HTTPException(status_code=400, detail="This coupon doesn't apply to this purchase")
    if payload.base_inr < (promo.get("min_order_inr") or 0):
        raise HTTPException(
            status_code=400,
            detail=f"Minimum order ₹{promo.get('min_order_inr', 0):,} required",
        )
    discount = _apply_discount(promo, payload.base_inr)
    return {
        "valid": True,
        "code": code,
        "title": promo.get("title"),
        "discount_inr": discount,
        "final_inr": max(0, payload.base_inr - discount),
        "discount_type": promo.get("discount_type"),
        "discount_value": promo.get("discount_value"),
    }


# ----- Admin CRUD on promotions -----
@api_router.get("/admin/promotions")
async def admin_list_promotions(_admin: str = Depends(verify_admin)):
    docs = await db.promotions.find({}, {"_id": 0}).sort("starts_at", -1).to_list(length=500)
    return docs


@api_router.post("/admin/promotions")
async def admin_create_promotion(payload: PromotionIn, _admin: str = Depends(verify_admin)):
    doc = payload.model_dump()
    doc["code"] = (doc.get("code") or "").strip().upper()
    if doc["code"]:
        existing = await db.promotions.find_one({"code": doc["code"]})
        if existing and existing.get("id") != doc["id"]:
            raise HTTPException(status_code=409, detail="Coupon code already in use")
    if await db.promotions.find_one({"id": doc["id"]}):
        raise HTTPException(status_code=409, detail="Promotion id already exists")
    await db.promotions.insert_one(doc)
    return {"success": True}


@api_router.put("/admin/promotions/{pid}")
async def admin_update_promotion(pid: str, payload: PromotionIn, _admin: str = Depends(verify_admin)):
    doc = payload.model_dump()
    doc["code"] = (doc.get("code") or "").strip().upper()
    res = await db.promotions.update_one({"id": pid}, {"$set": doc})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Promotion not found")
    return {"success": True}


@api_router.delete("/admin/promotions/{pid}")
async def admin_delete_promotion(pid: str, _admin: str = Depends(verify_admin)):
    res = await db.promotions.delete_one({"id": pid})
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
