"""Backend API tests for Guidance Angel landing/booking platform."""
import os
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://guidance-angel.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USER = "jenika"
ADMIN_PASS = "guidance@2026"


def _next_weekday(target_dow: int) -> str:
    today = date.today()
    delta = (target_dow - today.weekday()) % 7
    if delta == 0:
        delta = 7
    return (today + timedelta(days=delta)).isoformat()


NEXT_MONDAY = _next_weekday(0)
NEXT_SUNDAY = _next_weekday(6)


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/admin/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return r.json()["token"]


# ============== Public content ==============
class TestServices:
    def test_services_returns_nine(self, session):
        r = session.get(f"{API}/services")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 9
        cats = {s["category"] for s in data}
        assert cats == {"tarot_numerology", "akashic", "voice_note"}
        # No mongo _id leakage
        assert all("_id" not in s for s in data)

    def test_testimonials_returns_eight(self, session):
        r = session.get(f"{API}/testimonials")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 8
        assert all(t["rating"] >= 1 for t in data)


# ============== Slots ==============
class TestSlots:
    def test_monday_open_with_slots(self, session):
        r = session.get(f"{API}/slots/{NEXT_MONDAY}")
        assert r.status_code == 200
        data = r.json()
        assert data["is_open"] is True
        assert "10:00 AM" in data["slots"]
        assert "7:30 PM" not in data["slots"]
        # Last slot should be 7:00 PM
        assert "7:00 PM" in data["slots"]
        # Total expected 19 slots (10:00..19:00 inclusive at 30min)
        assert len(data["slots"]) >= 18

    def test_sunday_closed(self, session):
        r = session.get(f"{API}/slots/{NEXT_SUNDAY}")
        assert r.status_code == 200
        data = r.json()
        assert data["is_open"] is False
        assert data["slots"] == []

    def test_invalid_date(self, session):
        r = session.get(f"{API}/slots/not-a-date")
        assert r.status_code == 400


# ============== Bookings ==============
class TestBookings:
    def test_live_reading_requires_date_and_slot(self, session):
        payload = {
            "service_id": "tn-30",
            "customer_name": "TEST_NoSchedule",
            "customer_email": "test@example.com",
            "customer_phone": "+919999999999",
        }
        r = session.post(f"{API}/bookings/create-order", json=payload)
        assert r.status_code == 400
        assert "booking_date" in r.text

    def test_invalid_service_404(self, session):
        payload = {
            "service_id": "does-not-exist",
            "customer_name": "TEST",
            "customer_email": "test@example.com",
            "customer_phone": "+91999",
            "booking_date": NEXT_MONDAY,
            "booking_slot": "10:00 AM",
        }
        r = session.post(f"{API}/bookings/create-order", json=payload)
        assert r.status_code == 404

    def test_create_order_mock_and_verify_payment(self, session):
        payload = {
            "service_id": "tn-30",
            "customer_name": "TEST_Mockflow",
            "customer_email": "TEST_mock@example.com",
            "customer_phone": "+919999999999",
            "booking_date": NEXT_MONDAY,
            "booking_slot": "11:00 AM",
            "question": "Career",
        }
        r = session.post(f"{API}/bookings/create-order", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["is_mock"] is True
        assert body["amount_paise"] == 4000 * 100
        assert body["razorpay_order_id"].startswith("order_mock_")
        booking_id = body["booking_id"]

        # Verify payment in mock mode
        v = session.post(
            f"{API}/bookings/verify-payment",
            json={
                "booking_id": booking_id,
                "razorpay_order_id": body["razorpay_order_id"],
                "razorpay_payment_id": "pay_mock_test_123",
            },
        )
        assert v.status_code == 200, v.text
        vb = v.json()
        assert vb["success"] is True
        assert vb["booking"]["payment_status"] == "paid"
        assert vb["booking"]["booking_status"] == "confirmed"

    def test_voice_note_no_schedule_required(self, session):
        payload = {
            "service_id": "vn-question",
            "customer_name": "TEST_VoiceNote",
            "customer_email": "TEST_vn@example.com",
            "customer_phone": "+919998887777",
            "question": "When will I get clarity?",
        }
        r = session.post(f"{API}/bookings/create-order", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["amount_paise"] == 550 * 100
        assert body["is_mock"] is True


# ============== Admin ==============
class TestAdmin:
    def test_login_invalid_returns_401(self, session):
        r = session.post(f"{API}/admin/login", json={"username": "x", "password": "y"})
        assert r.status_code == 401

    def test_login_success(self, session):
        r = session.post(f"{API}/admin/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data["username"] == ADMIN_USER

    def test_bookings_requires_token(self, session):
        r = session.get(f"{API}/admin/bookings")
        assert r.status_code == 401

    def test_bookings_with_token(self, session, admin_token):
        r = session.get(f"{API}/admin/bookings", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # Should contain our created TEST_ booking
        names = [b.get("customer_name", "") for b in data]
        assert any(n.startswith("TEST_") for n in names)
        assert all("_id" not in b for b in data)

    def test_stats_requires_token(self, session):
        r = session.get(f"{API}/admin/stats")
        assert r.status_code == 401

    def test_stats_with_token(self, session, admin_token):
        r = session.get(f"{API}/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        data = r.json()
        for k in ("total_bookings", "paid", "pending", "revenue_inr"):
            assert k in data
        assert data["paid"] >= 1  # because of mock-paid booking earlier
        assert data["revenue_inr"] >= 4000
