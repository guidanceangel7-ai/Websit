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
    category: str  # tarot_numerology | akashic | voice_note
    name: str
    duration_minutes: Optional[int] = None
    price_inr: int
    description: str
    is_voice_note: bool = False


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
SEED_SERVICES = [
    {"id": "tn-15", "category": "tarot_numerology", "name": "Tarot + Numerology Reading", "duration_minutes": 15, "price_inr": 2100,
     "description": "A focused 15-minute session blending tarot insights with numerology guidance for one specific question.", "is_voice_note": False},
    {"id": "tn-30", "category": "tarot_numerology", "name": "Tarot + Numerology Reading", "duration_minutes": 30, "price_inr": 4000,
     "description": "A 30-minute reading exploring multiple aspects of your life with deeper numerology layers.", "is_voice_note": False},
    {"id": "tn-45", "category": "tarot_numerology", "name": "Tarot + Numerology Reading", "duration_minutes": 45, "price_inr": 6500,
     "description": "An in-depth 45-minute consultation covering relationships, career, finances and life path.", "is_voice_note": False},
    {"id": "ak-30", "category": "akashic", "name": "Akashic Record Reading", "duration_minutes": 30, "price_inr": 4000,
     "description": "Access your soul records for clarity on past patterns and your soul's current chapter.", "is_voice_note": False},
    {"id": "ak-45", "category": "akashic", "name": "Akashic Record Reading", "duration_minutes": 45, "price_inr": 5500,
     "description": "An expanded Akashic session diving into karmic threads, relationships and life lessons.", "is_voice_note": False},
    {"id": "ak-60", "category": "akashic", "name": "Akashic Record Reading", "duration_minutes": 60, "price_inr": 7500,
     "description": "A complete one-hour Akashic journey – soul gifts, blocks, healings and forward path.", "is_voice_note": False},
    {"id": "vn-question", "category": "voice_note", "name": "Question Tarot + Numerology", "duration_minutes": None, "price_inr": 550,
     "description": "Ask one specific question – receive a recorded voice note answer within 48 hours.", "is_voice_note": True},
    {"id": "vn-tarotscope", "category": "voice_note", "name": "Tarotscope", "duration_minutes": None, "price_inr": 1500,
     "description": "Personalised yearly tarotscope delivered as a voice note – your year ahead at a glance.", "is_voice_note": True},
    {"id": "vn-numerology-report", "category": "voice_note", "name": "Personal Numerology Report", "duration_minutes": None, "price_inr": 2121,
     "description": "Detailed personal numerology report with life path, soul number and yearly forecast.", "is_voice_note": True},
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
    services_count = await db.services.count_documents({})
    if services_count == 0:
        await db.services.insert_many([dict(s) for s in SEED_SERVICES])
    testimonials_count = await db.testimonials.count_documents({})
    if testimonials_count == 0:
        await db.testimonials.insert_many([dict(t) for t in SEED_TESTIMONIALS])
    logger.info(f"DB seeded. Services: {await db.services.count_documents({})}, Testimonials: {await db.testimonials.count_documents({})}")


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
    docs = await db.services.find({}, {"_id": 0}).to_list(length=100)
    return docs


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
