"""Email service — Gmail SMTP primary, Resend fallback."""
import asyncio
import logging
import os
import smtplib
import ssl
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
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


def _smtp_configured() -> bool:
    return bool(_cfg("SMTP_HOST") and _cfg("SMTP_USER") and _cfg("SMTP_PASSWORD"))


def _smtp_send_sync(to_addr: str, subject: str, html: str, reply_to: str = "") -> Optional[str]:
    """Synchronous SMTP send — wrapped via asyncio.to_thread by the dispatcher."""
    host = _cfg("SMTP_HOST")
    port = int(_cfg("SMTP_PORT", "587"))
    user = _cfg("SMTP_USER")
    password = _cfg("SMTP_PASSWORD", "").replace(" ", "")
    from_name = _cfg("SMTP_FROM_NAME", "Guidance Angel")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr((from_name, user))
    msg["To"] = to_addr
    if reply_to:
        msg["Reply-To"] = reply_to
    # Generate a stable Message-ID we can return as the "id"
    mid = f"<{uuid.uuid4().hex}@guidanceangel7.com>"
    msg["Message-ID"] = mid
    # Plain-text fallback for clients that block HTML
    msg.attach(MIMEText("Your message is available in HTML format.", "plain"))
    msg.attach(MIMEText(html, "html"))

    ctx = ssl.create_default_context()
    with smtplib.SMTP(host, port, timeout=15) as server:
        server.ehlo()
        server.starttls(context=ctx)
        server.ehlo()
        server.login(user, password)
        server.sendmail(user, [to_addr], msg.as_string())
    return mid


async def _dispatch_email(
    to_addr: str, subject: str, html: str, reply_to: str = ""
) -> Optional[str]:
    """Try Gmail SMTP first; fall back to Resend if SMTP fails or is missing."""
    # ---- 1. Gmail SMTP ----
    if _smtp_configured() and not _cfg("SMTP_USER", "").startswith("PLACEHOLDER"):
        try:
            mid = await asyncio.to_thread(_smtp_send_sync, to_addr, subject, html, reply_to)
            logger.info(f"SMTP sent to={to_addr} id={mid}")
            return mid
        except Exception as e:
            logger.warning(f"SMTP send failed (will try Resend): {e}")

    # ---- 2. Resend fallback ----
    if not _cfg("RESEND_API_KEY"):
        logger.info("RESEND_API_KEY not set — email skipped")
        return None
    sender = _cfg("RESEND_FROM_EMAIL", "Guidance Angel <onboarding@resend.dev>")
    try:
        params = {"from": sender, "to": [to_addr], "subject": subject, "html": html}
        if reply_to:
            params["reply_to"] = reply_to
        result = await asyncio.to_thread(resend.Emails.send, params)
        eid = result.get("id") if isinstance(result, dict) else None
        logger.info(f"Resend sent to={to_addr} id={eid}")
        return eid
    except Exception as e:
        logger.error(f"Both SMTP and Resend failed for to={to_addr}: {e}")
        return None


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
    """Send confirmation email to the customer. Returns mail id or None.

    Fails gracefully — never raises so booking flow is unaffected.
    """
    reply_to = _cfg("RESEND_REPLY_TO")
    admin_email = _cfg("ADMIN_NOTIFICATION_EMAIL")
    to_email = booking.get("customer_email")
    if not to_email:
        return None
    email_id = await _dispatch_email(
        to_addr=to_email,
        subject=f"✦ Your reading is confirmed — {booking.get('service_name', 'Guidance Angel')}",
        html=_booking_html(booking),
        reply_to=reply_to,
    )

    # Also notify admin (Jenika)
    if admin_email and admin_email.lower() != to_email.lower():
        try:
            await _dispatch_email(
                to_addr=admin_email,
                subject=f"New booking: {booking.get('customer_name')} — {booking.get('service_name')}",
                html=_admin_html(booking),
                reply_to=reply_to,
            )
        except Exception as e:
            logger.warning(f"Admin email failed: {e}")
    return email_id


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
    reply_to = _cfg("RESEND_REPLY_TO")
    admin_email = _cfg("ADMIN_NOTIFICATION_EMAIL")
    to_email = order.get("customer_email")
    if not to_email:
        return None
    email_id = await _dispatch_email(
        to_addr=to_email,
        subject=f"✦ Order confirmed · #{(order.get('id') or '')[:8].upper()} — Guidance Angel Sacred Shop",
        html=_order_html(order),
        reply_to=reply_to,
    )
    if admin_email and admin_email.lower() != to_email.lower():
        try:
            await _dispatch_email(
                to_addr=admin_email,
                subject=f"🛍️ New order: {order.get('customer_name')} · ₹{int(order.get('total_inr',0)):,}",
                html=_order_html(order),
                reply_to=reply_to,
            )
        except Exception as e:
            logger.warning(f"Admin order email failed: {e}")
    return email_id



# ----- Admin attempt alerts ---------------------------------------------------
# These fire from /create-order endpoints so the admin gets notified even when
# the customer abandons the Razorpay modal. They go ONLY to the admin (never
# the customer), so they bypass Resend's testing-mode restriction.

def _attempt_summary_html(title: str, lines: list, customer: dict) -> str:
    rows = "".join(
        f'<tr><td style="padding:6px 0; color:#6B5B95; font-size:12px; letter-spacing:0.16em; text-transform:uppercase;">{k}</td>'
        f'<td style="padding:6px 0 6px 16px; color:#3A2E5D; font-size:14px; font-family: Georgia, serif;">{v}</td></tr>'
        for k, v in lines
    )
    return f"""
    <html><body style="margin:0; background:#FBF4E8; font-family: -apple-system, sans-serif;">
      <table align="center" cellpadding="0" cellspacing="0" width="560" style="background:#fff; border-radius:18px; margin:32px auto; box-shadow:0 6px 18px rgba(58,46,93,0.08);">
        <tr><td style="padding:24px 28px; background:linear-gradient(135deg, #6B5B95, #9B8AC4); border-top-left-radius:18px; border-top-right-radius:18px; color:#FBF4E8;">
          <div style="font-size:11px; letter-spacing:0.32em; text-transform:uppercase; opacity:0.85;">⚠ Action needed</div>
          <h2 style="margin:6px 0 0; font-family: Georgia, serif; font-size:22px;">{title}</h2>
          <p style="margin:6px 0 0; font-size:13px; opacity:0.9;">A customer started a booking/checkout — follow up if they didn't complete payment.</p>
        </td></tr>
        <tr><td style="padding:18px 28px;">
          <table cellpadding="0" cellspacing="0" width="100%">{rows}</table>
        </td></tr>
        <tr><td style="padding:6px 28px 22px;">
          <div style="font-size:11px; letter-spacing:0.18em; color:#9B8AC4; text-transform:uppercase; margin-bottom:8px;">Reach the customer</div>
          <a href="tel:{customer.get('customer_phone','')}" style="display:inline-block; margin:4px 6px 0 0; padding:9px 16px; border-radius:999px; background:#FBE4D5; color:#3A2E5D; text-decoration:none; font-size:13px;">Call</a>
          <a href="mailto:{customer.get('customer_email','')}" style="display:inline-block; margin:4px 6px 0 0; padding:9px 16px; border-radius:999px; background:#E6DDF1; color:#3A2E5D; text-decoration:none; font-size:13px;">Email</a>
          <a href="https://wa.me/{(customer.get('customer_phone') or '').lstrip('+').replace(' ','')}" style="display:inline-block; margin:4px 0; padding:9px 16px; border-radius:999px; background:#6B5B95; color:#FBF4E8; text-decoration:none; font-size:13px;">WhatsApp</a>
        </td></tr>
      </table>
    </body></html>
    """


async def send_booking_attempt_alert(booking: dict) -> Optional[str]:
    """Notify admin that a booking was *attempted* (paid or not)."""
    reply_to = _cfg("RESEND_REPLY_TO")
    admin_email = _cfg("ADMIN_NOTIFICATION_EMAIL")
    if not admin_email:
        return None
    schedule = (
        f"{booking.get('booking_date')} · {booking.get('booking_slot')}"
        if booking.get("booking_date")
        else "Voice note (no slot)"
    )
    lines = [
        ("Customer", booking.get("customer_name", "—")),
        ("Email", booking.get("customer_email", "—")),
        ("Phone", booking.get("customer_phone", "—")),
        ("Service", booking.get("service_name", "—")),
        ("Schedule", schedule),
        ("Amount", f"₹{int(booking.get('final_price_inr') or booking.get('service_price_inr', 0)):,}"),
        ("Coupon", booking.get("applied_coupon_code") or "—"),
        ("Status", "Attempt — payment not confirmed yet"),
    ]
    if booking.get("question"):
        lines.append(("Question", str(booking["question"])[:200]))
    return await _dispatch_email(
        to_addr=admin_email,
        subject=f"⏳ Booking attempt: {booking.get('customer_name','?')} — {booking.get('service_name','?')}",
        html=_attempt_summary_html("New Booking Attempt", lines, booking),
        reply_to=reply_to,
    )


async def send_order_attempt_alert(order: dict) -> Optional[str]:
    """Notify admin that a shop order was *attempted* (paid or not)."""
    reply_to = _cfg("RESEND_REPLY_TO")
    admin_email = _cfg("ADMIN_NOTIFICATION_EMAIL")
    if not admin_email:
        return None
    items = order.get("items") or []
    items_str = ", ".join(
        f"{(it.get('product_name') or '?')} ×{it.get('quantity', 1)}" for it in items[:5]
    ) or "—"
    if len(items) > 5:
        items_str += f" +{len(items) - 5} more"
    lines = [
        ("Customer", order.get("customer_name", "—")),
        ("Email", order.get("customer_email", "—")),
        ("Phone", order.get("customer_phone", "—")),
        ("Items", items_str),
        ("Total", f"₹{int(order.get('total_inr', 0)):,}"),
        ("Coupon", order.get("applied_coupon_code") or "—"),
        ("Status", "Attempt — payment not confirmed yet"),
    ]
    return await _dispatch_email(
        to_addr=admin_email,
        subject=f"⏳ Order attempt: {order.get('customer_name','?')} · ₹{int(order.get('total_inr',0)):,}",
        html=_attempt_summary_html("New Shop Order Attempt", lines, order),
        reply_to=reply_to,
    )
