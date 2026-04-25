"""WhatsApp Cloud API (Meta) service.

Sends booking confirmation messages to customers after successful payment.
Falls back to no-op if env vars are not configured. Never raises – all failures
are logged so the booking flow is unaffected.
"""
import logging
import os
import re
from pathlib import Path
from typing import Optional, List, Dict, Any

import httpx
from dotenv import load_dotenv

# Ensure .env loads even if imported before server's load_dotenv
load_dotenv(Path(__file__).parent / ".env")

logger = logging.getLogger(__name__)

GRAPH_VERSION = "v22.0"


def _cfg(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


def _is_configured() -> bool:
    pid = _cfg("WHATSAPP_PHONE_NUMBER_ID")
    tok = _cfg("WHATSAPP_ACCESS_TOKEN")
    return bool(pid and tok and not pid.startswith("PLACEHOLDER") and not tok.startswith("PLACEHOLDER"))


def _normalize_phone(phone: str) -> str:
    """Strip + and non-digits. Returns digits-only string."""
    cleaned = re.sub(r"[^\d]", "", phone or "")
    return cleaned


def _format_amount(amt) -> str:
    try:
        return f"₹{int(amt):,}"
    except Exception:
        return f"₹{amt}"


def _booking_text(booking: Dict[str, Any]) -> str:
    name = booking.get("customer_name", "Beautiful soul")
    service = booking.get("service_name", "Reading")
    schedule = ""
    if booking.get("booking_date") and booking.get("booking_slot"):
        schedule = f"\n📅 {booking['booking_date']} · {booking['booking_slot']}"
    else:
        schedule = "\n🎧 Voice note will reach you on WhatsApp within 48 hrs."
    amount = _format_amount(booking.get("service_price_inr", 0))
    return (
        f"✦ Hello {name}!\n\n"
        f"Your booking with *Guidance Angel* is confirmed.\n\n"
        f"🌙 *Service:* {service}{schedule}\n"
        f"💜 *Paid:* {amount}\n\n"
        f"I'll be holding space for you. If you have any specific questions or birth details to share, just reply to this message.\n\n"
        f"With love,\nJenika · Guidance Angel"
    )


async def send_booking_whatsapp(booking: Dict[str, Any]) -> Optional[str]:
    """Send WhatsApp confirmation. Returns message id or None.

    Uses free-form text (works only inside a 24-hr customer-care window). For
    first-touch confirmations in production, configure WHATSAPP_TEMPLATE_NAME to
    use an approved template. We attempt template first when configured, then
    fall back to free-form text.
    """
    if not _is_configured():
        logger.info("WHATSAPP not configured – skipping send")
        return None

    phone_id = _cfg("WHATSAPP_PHONE_NUMBER_ID")
    token = _cfg("WHATSAPP_ACCESS_TOKEN")
    template_name = _cfg("WHATSAPP_TEMPLATE_NAME")
    to_phone = _normalize_phone(booking.get("customer_phone", ""))
    if not to_phone:
        logger.warning("WhatsApp: empty/invalid customer phone, skipping")
        return None

    url = f"https://graph.facebook.com/{GRAPH_VERSION}/{phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    async def _post(payload: Dict[str, Any]) -> Optional[str]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code >= 400:
                    logger.error(
                        f"WhatsApp send failed {resp.status_code}: {resp.text[:300]}"
                    )
                    return None
                data = resp.json()
                return (
                    data.get("messages", [{}])[0].get("id") if data.get("messages") else None
                )
        except Exception as e:
            logger.error(f"WhatsApp request error: {e}")
            return None

    # Prefer template if configured
    if template_name:
        params: List[Dict[str, str]] = [
            {"type": "text", "text": booking.get("customer_name", "")},
            {"type": "text", "text": booking.get("service_name", "")},
            {
                "type": "text",
                "text": (
                    f"{booking.get('booking_date')} · {booking.get('booking_slot')}"
                    if booking.get("booking_date")
                    else "Voice note within 48 hrs"
                ),
            },
            {"type": "text", "text": _format_amount(booking.get("service_price_inr", 0))},
        ]
        template_payload = {
            "messaging_product": "whatsapp",
            "to": to_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": _cfg("WHATSAPP_TEMPLATE_LANG", "en")},
                "components": [{"type": "body", "parameters": params}],
            },
        }
        msg_id = await _post(template_payload)
        if msg_id:
            logger.info(f"WhatsApp template sent id={msg_id} to={to_phone}")
            return msg_id
        # fall through to text send

    # Free-form text fallback
    text_payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"preview_url": False, "body": _booking_text(booking)},
    }
    msg_id = await _post(text_payload)
    if msg_id:
        logger.info(f"WhatsApp text sent id={msg_id} to={to_phone}")
    return msg_id
