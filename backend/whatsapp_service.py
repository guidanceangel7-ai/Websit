"""WhatsApp service powered by Twilio.

Sends booking + order confirmation messages to customers after successful payment.
Falls back to a no-op log if env vars are not configured. Never raises – all
failures are logged so the booking/checkout flow is unaffected.

Setup:
  TWILIO_ACCOUNT_SID   - From console.twilio.com (starts with AC...)
  TWILIO_AUTH_TOKEN    - From console.twilio.com
  TWILIO_WHATSAPP_FROM - Your approved sender, e.g. "+13185938937"
                         OR the sandbox: "+14155238886"
                         (the "whatsapp:" prefix is added automatically)
"""
import logging
import os
import re
from pathlib import Path
from typing import Optional, Dict, Any

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

logger = logging.getLogger(__name__)


def _cfg(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


def _is_configured() -> bool:
    sid = _cfg("TWILIO_ACCOUNT_SID")
    tok = _cfg("TWILIO_AUTH_TOKEN")
    frm = _cfg("TWILIO_WHATSAPP_FROM")
    return bool(
        sid
        and tok
        and frm
        and not sid.startswith("PLACEHOLDER")
        and not tok.startswith("PLACEHOLDER")
    )


def _normalize_phone(phone: str) -> str:
    """Return E.164-formatted number with leading +. Indian numbers without
    country code get +91 prefixed."""
    cleaned = re.sub(r"[^\d]", "", phone or "")
    if not cleaned:
        return ""
    if len(cleaned) == 10:
        cleaned = "91" + cleaned
    return "+" + cleaned


def _format_amount(amt) -> str:
    try:
        return f"₹{int(amt):,}"
    except Exception:
        return f"₹{amt}"


def _booking_text(booking: Dict[str, Any]) -> str:
    name = booking.get("customer_name", "Beautiful soul")
    service = booking.get("service_name", "Reading")
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
        f"I'll be holding space for you. If you have any specific questions or "
        f"birth details to share, just reply to this message.\n\n"
        f"With love,\nJenika · Guidance Angel"
    )


def _order_text(order: Dict[str, Any]) -> str:
    name = order.get("customer_name", "Beautiful soul")
    items = order.get("items") or []
    items_lines = "\n".join(
        f"  • {it.get('product_name', 'Item')} × {it.get('quantity', 1)}"
        for it in items[:6]
    )
    if len(items) > 6:
        items_lines += f"\n  • +{len(items) - 6} more"
    total = _format_amount(order.get("total_inr", 0))
    return (
        f"✦ Thank you {name}!\n\n"
        f"Your *Sacred Shop* order is confirmed.\n\n"
        f"🛍️ *Items:*\n{items_lines}\n"
        f"💜 *Total Paid:* {total}\n\n"
        f"I'll personally energise everything before shipping. You'll receive "
        f"a tracking link within 2 business days.\n\n"
        f"With love,\nJenika · Guidance Angel"
    )


def _send(body: str, to_phone: str) -> Optional[str]:
    """Synchronously send a WhatsApp message via Twilio. Returns message SID
    or None on any failure."""
    if not _is_configured():
        logger.info("Twilio WhatsApp not configured – skipping send")
        return None

    to = _normalize_phone(to_phone)
    if not to:
        logger.warning("Twilio WhatsApp: empty/invalid customer phone, skipping")
        return None

    try:
        from twilio.rest import Client  # local import so service starts even if SDK missing

        client = Client(_cfg("TWILIO_ACCOUNT_SID"), _cfg("TWILIO_AUTH_TOKEN"))
        from_raw = _cfg("TWILIO_WHATSAPP_FROM").strip()
        if not from_raw.startswith("+"):
            from_raw = "+" + re.sub(r"[^\d]", "", from_raw)
        msg = client.messages.create(
            from_=f"whatsapp:{from_raw}",
            to=f"whatsapp:{to}",
            body=body,
        )
        logger.info(f"Twilio WhatsApp sent sid={msg.sid} to={to}")
        return msg.sid
    except Exception as e:
        logger.error(f"Twilio WhatsApp send failed to={to}: {e}")
        return None


# Public helpers — keep async signatures so server.py call-sites don't change.
async def send_booking_whatsapp(booking: Dict[str, Any]) -> Optional[str]:
    """Send booking confirmation. Returns Twilio message SID or None."""
    return _send(_booking_text(booking), booking.get("customer_phone", ""))


async def send_order_whatsapp(order: Dict[str, Any]) -> Optional[str]:
    """Send shop-order confirmation. Returns Twilio message SID or None."""
    return _send(_order_text(order), order.get("customer_phone", ""))
