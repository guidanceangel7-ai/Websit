"""Email service powered by Resend."""
import asyncio
import logging
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Ensure .env is loaded even if this module is imported before server's load_dotenv
load_dotenv(Path(__file__).parent / ".env")

import resend

logger = logging.getLogger(__name__)


def _cfg(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


if _cfg("RESEND_API_KEY"):
    resend.api_key = _cfg("RESEND_API_KEY")


def _booking_html(booking: dict) -> str:
    is_voice = not booking.get("booking_date")
    schedule_html = ""
    if not is_voice:
        schedule_html = f"""
          <tr>
            <td style="padding: 8px 0; color: #6B5B95; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase;">Date &amp; Time</td>
          </tr>
          <tr>
            <td style="padding: 0 0 16px 0; color: #3A2E5D; font-size: 18px; font-family: Georgia, serif;">
              {booking.get('booking_date')} · {booking.get('booking_slot')}
            </td>
          </tr>
        """
    else:
        schedule_html = """
          <tr>
            <td style="padding: 8px 0; color: #6B5B95; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase;">Delivery</td>
          </tr>
          <tr>
            <td style="padding: 0 0 16px 0; color: #3A2E5D; font-size: 16px;">
              You'll receive a recorded voice note on WhatsApp within 48 hours.
            </td>
          </tr>
        """

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Booking confirmed · Guidance Angel</title></head>
<body style="margin:0; padding:0; background:#FBF4E8; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF4E8;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background:#FFFFFF; border-radius: 24px; overflow:hidden; border: 1px solid rgba(235,185,154,0.4);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #C8B6E2 0%, #F4C6D6 100%); padding: 36px 32px; text-align:center;">
              <div style="font-family: Georgia, serif; font-size: 32px; color: #3A2E5D; font-style: italic;">guidance <span style="color:#D9A382; font-style: normal;">angel</span></div>
              <div style="font-size: 11px; letter-spacing: 0.3em; color: #6B5B95; text-transform: uppercase; margin-top: 6px;">Tarot · Numerology · Akashic</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 36px 8px 36px;">
              <div style="color: #D9A382; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase;">✦ Booking Confirmed</div>
              <h1 style="font-family: Georgia, serif; font-size: 28px; color: #3A2E5D; margin: 12px 0 8px 0; line-height: 1.2;">
                Thank you, {booking.get('customer_name', 'Beautiful soul')}.
              </h1>
              <p style="color: #3A2E5D; opacity: 0.8; line-height: 1.6; font-size: 15px;">
                Your reading is reserved. Below are the details — keep this email handy and reach out on WhatsApp if anything changes.
              </p>
            </td>
          </tr>

          <!-- Booking card -->
          <tr>
            <td style="padding: 0 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF4E8; border-radius: 16px; padding: 20px; margin: 16px 0;">
                <tr>
                  <td style="padding: 8px 0; color: #6B5B95; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase;">Service</td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px 0; color: #3A2E5D; font-size: 18px; font-family: Georgia, serif;">{booking.get('service_name','')}</td>
                </tr>
                {schedule_html}
                <tr>
                  <td style="padding: 8px 0; color: #6B5B95; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase;">Amount paid</td>
                </tr>
                <tr>
                  <td style="padding: 0 0 8px 0; color: #6B5B95; font-size: 22px; font-family: Georgia, serif;">
                    ₹{int(booking.get('service_price_inr', 0)):,}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Notes -->
          <tr>
            <td style="padding: 0 36px;">
              <p style="color: #3A2E5D; opacity: 0.8; line-height: 1.6; font-size: 14px;">
                <strong style="color:#6B5B95;">A small note:</strong> for your reading, please be in a quiet space and have any questions ready.
                If you've shared your birth details, those will guide the numerology side of your session.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 16px 36px 24px 36px;">
              <a href="https://wa.me/918320135858" style="display:inline-block; background:#6B5B95; color:#FBF4E8; text-decoration:none; padding: 12px 28px; border-radius: 999px; font-size: 14px; font-weight: 500;">
                Chat with Jenika on WhatsApp
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#FBF4E8; padding: 20px 36px; border-top: 1px solid rgba(235,185,154,0.4);">
              <p style="color: #3A2E5D; opacity: 0.6; font-size: 12px; margin: 0; text-align: center;">
                Guidance Angel · Jenika Bhayani · Gujarat, India<br/>
                Reply to this email or message +91 83201 35858
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    """


async def send_booking_confirmation(booking: dict) -> Optional[str]:
    """Send confirmation email to the customer. Returns Resend email id or None.

    Fails gracefully — never raises so booking flow is unaffected.
    """
    api_key = _cfg("RESEND_API_KEY")
    sender = _cfg(
        "RESEND_FROM_EMAIL", "Guidance Angel <onboarding@resend.dev>"
    )
    reply_to = _cfg("RESEND_REPLY_TO")
    admin_email = _cfg("ADMIN_NOTIFICATION_EMAIL")
    if not api_key:
        logger.info("RESEND_API_KEY not set — skipping email send")
        return None
    resend.api_key = api_key  # ensure SDK is configured at runtime
    to_email = booking.get("customer_email")
    if not to_email:
        return None
    try:
        params = {
            "from": sender,
            "to": [to_email],
            "subject": f"✦ Your reading is confirmed — {booking.get('service_name', 'Guidance Angel')}",
            "html": _booking_html(booking),
        }
        if reply_to:
            params["reply_to"] = reply_to
        result = await asyncio.to_thread(resend.Emails.send, params)
        email_id = result.get("id") if isinstance(result, dict) else None
        logger.info(f"Resend email sent id={email_id} to={to_email}")

        # Also notify admin (Jenika)
        if admin_email and admin_email.lower() != to_email.lower():
            admin_params = {
                "from": sender,
                "to": [admin_email],
                "subject": f"New booking: {booking.get('customer_name')} — {booking.get('service_name')}",
                "html": _admin_html(booking),
            }
            if reply_to:
                admin_params["reply_to"] = reply_to
            try:
                await asyncio.to_thread(resend.Emails.send, admin_params)
            except Exception as e:
                logger.warning(f"Admin email failed: {e}")
        return email_id
    except Exception as e:
        logger.error(f"Failed to send booking email to {to_email}: {e}")
        return None


def _admin_html(booking: dict) -> str:
    return f"""
    <div style="font-family: Helvetica, Arial, sans-serif; background:#FBF4E8; padding:24px;">
      <h2 style="font-family: Georgia, serif; color:#3A2E5D;">New booking received ✦</h2>
      <table cellpadding="6" cellspacing="0" style="background:#fff; border-radius:12px;">
        <tr><td style="color:#6B5B95;">Customer</td><td>{booking.get('customer_name')}</td></tr>
        <tr><td style="color:#6B5B95;">Email</td><td>{booking.get('customer_email')}</td></tr>
        <tr><td style="color:#6B5B95;">Phone</td><td>{booking.get('customer_phone')}</td></tr>
        <tr><td style="color:#6B5B95;">Service</td><td>{booking.get('service_name')}</td></tr>
        <tr><td style="color:#6B5B95;">Date · Slot</td><td>{booking.get('booking_date') or '—'} · {booking.get('booking_slot') or '—'}</td></tr>
        <tr><td style="color:#6B5B95;">Amount</td><td>₹{int(booking.get('service_price_inr', 0)):,}</td></tr>
        <tr><td style="color:#6B5B95;">Question</td><td>{booking.get('question') or '—'}</td></tr>
      </table>
      <p style="color:#6B5B95; margin-top:16px;">View dashboard for the full list.</p>
    </div>
    """



def _order_html(order: dict) -> str:
    addr = order.get("address", {}) or {}
    item_rows = "".join(
        f"""<tr>
          <td style="padding:10px 12px; border-top:1px solid rgba(235,185,154,0.3); color:#3A2E5D;">{i.get('product_name','')}</td>
          <td style="padding:10px 12px; border-top:1px solid rgba(235,185,154,0.3); color:#6B5B95; text-align:center;">× {i.get('quantity',1)}</td>
          <td style="padding:10px 12px; border-top:1px solid rgba(235,185,154,0.3); color:#3A2E5D; text-align:right;">₹{int(i.get('line_total_inr',0)):,}</td>
        </tr>"""
        for i in (order.get("items") or [])
    )
    return f"""
<!DOCTYPE html>
<html><body style="margin:0; padding:0; background:#FBF4E8; font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF4E8;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background:#fff; border-radius:24px; overflow:hidden; border:1px solid rgba(235,185,154,0.4);">
        <tr><td style="background: linear-gradient(135deg, #C8B6E2 0%, #F4C6D6 100%); padding:32px; text-align:center;">
          <div style="font-family: Georgia, serif; font-size:30px; color:#3A2E5D; font-style:italic;">guidance <span style="color:#D9A382; font-style:normal;">angel</span></div>
          <div style="font-size:11px; letter-spacing:0.3em; color:#6B5B95; text-transform:uppercase; margin-top:6px;">Sacred Shop · Order Confirmation</div>
        </td></tr>
        <tr><td style="padding:32px 32px 12px 32px;">
          <div style="color:#D9A382; font-size:11px; letter-spacing:0.3em; text-transform:uppercase;">✦ Order Confirmed</div>
          <h1 style="font-family: Georgia, serif; font-size:26px; color:#3A2E5D; margin:10px 0 6px;">Thank you, {order.get('customer_name','beautiful soul')}!</h1>
          <p style="color:#3A2E5D; opacity:.8; line-height:1.6; font-size:14px;">Your order #{(order.get('id') or '')[:8].upper()} has been received. We'll dispatch your sacred items soon and keep you posted on WhatsApp.</p>
        </td></tr>
        <tr><td style="padding:0 32px 8px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF4E8; border-radius:14px;">
            <thead><tr>
              <th align="left" style="padding:12px 12px 8px; color:#9B8AC4; font-size:11px; letter-spacing:0.18em; text-transform:uppercase;">Item</th>
              <th align="center" style="padding:12px 12px 8px; color:#9B8AC4; font-size:11px; letter-spacing:0.18em; text-transform:uppercase;">Qty</th>
              <th align="right" style="padding:12px 12px 8px; color:#9B8AC4; font-size:11px; letter-spacing:0.18em; text-transform:uppercase;">Total</th>
            </tr></thead>
            <tbody>{item_rows}</tbody>
            <tfoot><tr>
              <td colspan="2" style="padding:14px 12px; border-top:2px dashed rgba(235,185,154,0.5); color:#6B5B95; font-size:12px; letter-spacing:0.2em; text-transform:uppercase;">Total paid</td>
              <td style="padding:14px 12px; border-top:2px dashed rgba(235,185,154,0.5); color:#6B5B95; font-family: Georgia, serif; font-size:22px; text-align:right;">₹{int(order.get('total_inr',0)):,}</td>
            </tr></tfoot>
          </table>
        </td></tr>
        <tr><td style="padding:16px 32px;">
          <div style="font-size:11px; letter-spacing:0.18em; color:#9B8AC4; text-transform:uppercase; margin-bottom:6px;">Shipping to</div>
          <div style="color:#3A2E5D; line-height:1.55; font-size:14px;">
            {order.get('customer_name','')}<br/>
            {addr.get('line1','')}{(', ' + addr.get('line2')) if addr.get('line2') else ''}<br/>
            {addr.get('city','')}, {addr.get('state','')} {addr.get('postal_code','')}<br/>
            {addr.get('country','India')}<br/>
            {order.get('customer_phone','')}
          </div>
        </td></tr>
        <tr><td align="center" style="padding:8px 32px 28px;">
          <a href="https://wa.me/918320135858" style="display:inline-block; background:#6B5B95; color:#FBF4E8; text-decoration:none; padding:12px 24px; border-radius:999px; font-size:14px;">Chat with Jenika on WhatsApp</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
    """


async def send_order_confirmation(order: dict) -> Optional[str]:
    """Send order confirmation email to customer + admin notification."""
    api_key = _cfg("RESEND_API_KEY")
    sender = _cfg("RESEND_FROM_EMAIL", "Guidance Angel <onboarding@resend.dev>")
    reply_to = _cfg("RESEND_REPLY_TO")
    admin_email = _cfg("ADMIN_NOTIFICATION_EMAIL")
    if not api_key:
        logger.info("RESEND_API_KEY not set — skipping order email")
        return None
    resend.api_key = api_key
    to_email = order.get("customer_email")
    if not to_email:
        return None
    try:
        params = {
            "from": sender,
            "to": [to_email],
            "subject": f"✦ Order confirmed · #{(order.get('id') or '')[:8].upper()} — Guidance Angel Sacred Shop",
            "html": _order_html(order),
        }
        if reply_to:
            params["reply_to"] = reply_to
        result = await asyncio.to_thread(resend.Emails.send, params)
        email_id = result.get("id") if isinstance(result, dict) else None
        logger.info(f"Resend ORDER email sent id={email_id} to={to_email}")
        if admin_email and admin_email.lower() != to_email.lower():
            try:
                await asyncio.to_thread(
                    resend.Emails.send,
                    {
                        "from": sender,
                        "to": [admin_email],
                        "subject": f"🛍️ New order: {order.get('customer_name')} · ₹{int(order.get('total_inr',0)):,}",
                        "html": _order_html(order),
                        **({"reply_to": reply_to} if reply_to else {}),
                    },
                )
            except Exception as e:
                logger.warning(f"Admin order email failed: {e}")
        return email_id
    except Exception as e:
        logger.error(f"Failed to send order email to {to_email}: {e}")
        return None
