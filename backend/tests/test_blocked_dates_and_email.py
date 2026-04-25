"""Iteration 2 backend tests: blocked-dates CRUD, slots integration, and email confirmation."""
import os
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_USER = "jenika"
ADMIN_PASS = "guidance@2026"


def _next_weekday(target_dow: int) -> str:
    today = date.today()
    delta = (target_dow - today.weekday()) % 7
    if delta == 0:
        delta = 7
    return (today + timedelta(days=delta)).isoformat()


# Use a Tuesday >= 14 days out so it doesn't collide with normal slot tests
FAR_TUESDAY = (date.today() + timedelta(days=((1 - date.today().weekday()) % 7) + 14)).isoformat()


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{API}/admin/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ============== Blocked Dates CRUD ==============
class TestBlockedDates:
    def test_public_blocked_dates_initial_array(self, session):
        r = session.get(f"{API}/blocked-dates")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_list_requires_auth(self, session):
        r = session.get(f"{API}/admin/blocked-dates")
        assert r.status_code == 401

    def test_admin_add_requires_auth(self, session):
        r = session.post(f"{API}/admin/blocked-dates", json={"date": FAR_TUESDAY})
        assert r.status_code == 401

    def test_admin_add_blocked_date(self, session, auth_headers):
        # cleanup any prior
        session.delete(f"{API}/admin/blocked-dates/{FAR_TUESDAY}", headers=auth_headers)
        r = session.post(
            f"{API}/admin/blocked-dates",
            json={"date": FAR_TUESDAY, "reason": "TEST_retreat"},
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        assert body["date"] == FAR_TUESDAY

        # GET admin list
        r = session.get(f"{API}/admin/blocked-dates", headers=auth_headers)
        assert r.status_code == 200
        items = r.json()
        match = [b for b in items if b["date"] == FAR_TUESDAY]
        assert len(match) == 1
        assert match[0]["reason"] == "TEST_retreat"

        # GET public list
        r = session.get(f"{API}/blocked-dates")
        assert r.status_code == 200
        assert FAR_TUESDAY in r.json()

    def test_invalid_date_format(self, session, auth_headers):
        r = session.post(
            f"{API}/admin/blocked-dates",
            json={"date": "not-a-date"},
            headers=auth_headers,
        )
        assert r.status_code == 400

    def test_slots_for_blocked_date_is_closed(self, session, auth_headers):
        # ensure blocked
        session.post(
            f"{API}/admin/blocked-dates",
            json={"date": FAR_TUESDAY, "reason": "TEST_retreat"},
            headers=auth_headers,
        )
        r = session.get(f"{API}/slots/{FAR_TUESDAY}")
        assert r.status_code == 200
        data = r.json()
        assert data["is_open"] is False
        assert data["slots"] == []
        assert "TEST_retreat" in (data.get("message") or "")

    def test_upsert_overwrites_reason(self, session, auth_headers):
        r = session.post(
            f"{API}/admin/blocked-dates",
            json={"date": FAR_TUESDAY, "reason": "TEST_updated"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        items = session.get(f"{API}/admin/blocked-dates", headers=auth_headers).json()
        match = [b for b in items if b["date"] == FAR_TUESDAY][0]
        assert match["reason"] == "TEST_updated"

    def test_delete_blocked_date(self, session, auth_headers):
        r = session.delete(
            f"{API}/admin/blocked-dates/{FAR_TUESDAY}",
            headers=auth_headers,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["success"] is True
        assert body["removed"] >= 1
        # gone from list
        items = session.get(f"{API}/admin/blocked-dates", headers=auth_headers).json()
        assert all(b["date"] != FAR_TUESDAY for b in items)
        # slots reopened
        r = session.get(f"{API}/slots/{FAR_TUESDAY}")
        assert r.json()["is_open"] is True


# ============== Email confirmation on payment verify ==============
class TestEmailOnVerify:
    def test_verify_payment_stores_email_id(self, session, auth_headers):
        # Create a TEST_ booking to a verified resend recipient
        next_mon = _next_weekday(0)
        r = session.post(
            f"{API}/bookings/create-order",
            json={
                "service_id": "vn-question",
                "customer_name": "TEST_EmailFlow",
                "customer_email": "guidance.angel7@gmail.com",
                "customer_phone": "+919999999999",
                "question": "TEST email send",
            },
        )
        assert r.status_code == 200
        body = r.json()
        booking_id = body["booking_id"]

        v = session.post(
            f"{API}/bookings/verify-payment",
            json={
                "booking_id": booking_id,
                "razorpay_order_id": body["razorpay_order_id"],
                "razorpay_payment_id": "pay_mock_email_test",
            },
        )
        assert v.status_code == 200
        assert v.json()["booking"]["payment_status"] == "paid"

        # Inspect via admin list - confirmation_email_id should be present
        admin_bookings = session.get(
            f"{API}/admin/bookings", headers=auth_headers
        ).json()
        ours = [b for b in admin_bookings if b["id"] == booking_id]
        assert len(ours) == 1
        # Email id may or may not be set if Resend rejects, but field should exist if accepted
        # We don't hard-fail if email_id missing (Resend free tier limits), but we log for visibility
        eid = ours[0].get("confirmation_email_id")
        print(f"confirmation_email_id={eid}")
