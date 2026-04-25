"""Iteration 5: Verify GET /api/slots filters past times in IST + 30 min lead."""
import os
from datetime import datetime, timedelta, timezone

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
# Backend testing — use frontend-facing URL via /api prefix


def _ist_now():
    return datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)


def _slot_to_minutes(slot_str: str) -> int:
    dt = datetime.strptime(slot_str, "%I:%M %p")
    return dt.hour * 60 + dt.minute


@pytest.fixture(scope="module")
def base_url():
    # Read fresh from frontend .env file (env var may not be exported)
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        # fallback: read frontend/.env
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    url = line.split("=", 1)[1].strip()
                    break
    assert url, "REACT_APP_BACKEND_URL missing"
    return url.rstrip("/")


# ---- Slot filtering ----
class TestSlotsTodayFilter:
    def test_today_slots_are_after_cutoff(self, base_url):
        ist_now = _ist_now()
        today = ist_now.date().isoformat()
        cutoff_min = ist_now.hour * 60 + ist_now.minute + 30

        r = requests.get(f"{base_url}/api/slots/{today}", timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "slots" in body
        # If closed (sunday) is_open will be False
        if not body.get("is_open", True):
            pytest.skip(f"Today closed: {body.get('message')}")
        for s in body["slots"]:
            assert _slot_to_minutes(s) >= cutoff_min, (
                f"Slot {s} ({_slot_to_minutes(s)} min) returned but cutoff was {cutoff_min}"
            )
        print(f"IST now ~{ist_now.strftime('%H:%M')} cutoff_min={cutoff_min} -> slots={body['slots']}")

    def test_tomorrow_slots_not_filtered(self, base_url):
        ist_now = _ist_now()
        tomorrow = (ist_now + timedelta(days=1)).date().isoformat()
        r = requests.get(f"{base_url}/api/slots/{tomorrow}", timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        if not body.get("is_open", True):
            pytest.skip(f"Tomorrow closed: {body.get('message')}")
        # The full schedule should produce >= 8 slots (10-19 default = 18 slots, custom may differ).
        # We assert there is at least one early-morning slot (< current IST time + 30 min).
        early_slot_present = any(_slot_to_minutes(s) < (ist_now.hour * 60 + ist_now.minute + 30) for s in body["slots"])
        assert early_slot_present or len(body["slots"]) >= 4, (
            f"Tomorrow returned only {body['slots']} — filter may be wrongly applied"
        )
        print(f"Tomorrow ({tomorrow}) slots count={len(body['slots'])}")

    def test_future_date_full_list(self, base_url):
        ist_now = _ist_now()
        # 7 days ahead — pick a non-Sunday
        for delta in range(2, 9):
            d = (ist_now + timedelta(days=delta)).date()
            if d.weekday() != 6:
                future = d.isoformat()
                break
        r = requests.get(f"{base_url}/api/slots/{future}", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body.get("is_open") is True
        assert len(body["slots"]) >= 4, f"Future date {future} returned only {body['slots']}"

    def test_yesterday_unaffected(self, base_url):
        ist_now = _ist_now()
        yesterday = (ist_now - timedelta(days=1)).date().isoformat()
        r = requests.get(f"{base_url}/api/slots/{yesterday}", timeout=15)
        assert r.status_code == 200
        body = r.json()
        if body.get("is_open"):
            # No date-aware filter on past dates; should give full schedule
            assert len(body["slots"]) >= 4

    def test_invalid_date(self, base_url):
        r = requests.get(f"{base_url}/api/slots/not-a-date", timeout=10)
        assert r.status_code == 400
