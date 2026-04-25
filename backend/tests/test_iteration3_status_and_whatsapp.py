"""Iteration-3 backend tests:
1. PATCH /api/admin/bookings/{id} status update (auth, valid, invalid, not-found)
2. WhatsApp no-op on payment verify when env is PLACEHOLDER (booking still
   confirmed; backend log line 'WHATSAPP not configured – skipping send')
"""
import os
import time
import subprocess
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://guidance-angel.preview.emergentagent.com",
).rstrip("/")
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


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{API}/admin/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def created_booking(session):
    """Create a paid (mock) booking, return its id."""
    co = session.post(f"{API}/bookings/create-order", json={
        "service_id": "tn-15",
        "customer_name": "TEST_StatusEdit",
        "customer_email": "TEST_status@example.com",
        "customer_phone": "+919999999999",
        "booking_date": NEXT_MONDAY,
        "booking_slot": "12:00 PM",
    })
    assert co.status_code == 200, co.text
    cb = co.json()
    vp = session.post(f"{API}/bookings/verify-payment", json={
        "booking_id": cb["booking_id"],
        "razorpay_order_id": cb["razorpay_order_id"],
        "razorpay_payment_id": "pay_mock_test_iter3",
    })
    assert vp.status_code == 200, vp.text
    return cb["booking_id"]


# ============== PATCH status ==============
class TestPatchBookingStatus:
    def test_patch_without_token_401(self, session, created_booking):
        r = session.patch(f"{API}/admin/bookings/{created_booking}", json={"booking_status": "confirmed"})
        assert r.status_code == 401

    @pytest.mark.parametrize("status_value", ["pending", "confirmed", "completed", "cancelled", "no_show"])
    def test_patch_each_valid_status_persists(self, session, auth_headers, created_booking, status_value):
        r = session.patch(
            f"{API}/admin/bookings/{created_booking}",
            json={"booking_status": status_value},
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text
        assert r.json()["booking_status"] == status_value
        # Verify persisted via admin GET
        listing = session.get(f"{API}/admin/bookings", headers=auth_headers).json()
        match = [b for b in listing if b["id"] == created_booking]
        assert len(match) == 1
        assert match[0]["booking_status"] == status_value

    def test_patch_invalid_status_400(self, session, auth_headers, created_booking):
        r = session.patch(
            f"{API}/admin/bookings/{created_booking}",
            json={"booking_status": "obliterated"},
            headers=auth_headers,
        )
        assert r.status_code == 400
        assert "invalid" in r.text.lower() or "allowed" in r.text.lower()

    def test_patch_non_existent_404(self, session, auth_headers):
        r = session.patch(
            f"{API}/admin/bookings/does-not-exist-uuid",
            json={"booking_status": "confirmed"},
            headers=auth_headers,
        )
        assert r.status_code == 404


# ============== WhatsApp no-op ==============
class TestWhatsAppNoOp:
    def test_verify_payment_succeeds_with_placeholder_whatsapp(self, session, auth_headers):
        # Snapshot current size of supervisor backend stderr log
        log_paths = [
            "/var/log/supervisor/backend.err.log",
            "/var/log/supervisor/backend.out.log",
        ]
        sizes_before = {}
        for p in log_paths:
            try:
                sizes_before[p] = os.path.getsize(p)
            except OSError:
                sizes_before[p] = 0

        # Create + pay
        co = session.post(f"{API}/bookings/create-order", json={
            "service_id": "vn-question",
            "customer_name": "TEST_WANoop",
            "customer_email": "TEST_wa@example.com",
            "customer_phone": "+919998887777",
            "question": "WA no-op test",
        })
        assert co.status_code == 200, co.text
        cb = co.json()
        vp = session.post(f"{API}/bookings/verify-payment", json={
            "booking_id": cb["booking_id"],
            "razorpay_order_id": cb["razorpay_order_id"],
            "razorpay_payment_id": "pay_mock_wa_iter3",
        })
        assert vp.status_code == 200, vp.text
        body = vp.json()
        assert body["success"] is True
        # Booking IS still confirmed (WA failure must NOT break flow)
        assert body["booking"]["payment_status"] == "paid"
        assert body["booking"]["booking_status"] == "confirmed"

        # Allow async logging to flush
        time.sleep(1.0)

        # Look for the no-op log line in any of the backend logs (new portion)
        found = False
        target = "WHATSAPP not configured"
        for p in log_paths:
            try:
                with open(p, "rb") as fh:
                    fh.seek(sizes_before[p])
                    new_chunk = fh.read().decode("utf-8", errors="ignore")
                if target in new_chunk:
                    found = True
                    break
            except OSError:
                continue
        # Fallback: scan tail of file (in case sizes diverged)
        if not found:
            for p in log_paths:
                try:
                    out = subprocess.check_output(["tail", "-n", "300", p], text=True, errors="ignore")
                    if target in out:
                        found = True
                        break
                except Exception:
                    continue
        assert found, f"Expected '{target}' log line after verify-payment but did not find it"

    def test_confirmation_whatsapp_id_not_set_when_unconfigured(self, session, auth_headers):
        # All bookings should have no confirmation_whatsapp_id while WhatsApp is placeholder
        r = session.get(f"{API}/admin/bookings", headers=auth_headers)
        assert r.status_code == 200
        for b in r.json():
            # field should either be absent or empty/None
            wa_id = b.get("confirmation_whatsapp_id")
            assert wa_id in (None, "", False), f"Unexpected WhatsApp id on booking {b.get('id')}: {wa_id}"
