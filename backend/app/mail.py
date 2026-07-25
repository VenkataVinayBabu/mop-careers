"""Email helper.

In dev (APP_ENV=dev) or whenever SMTP_HOST is unset, messages are logged to the
console instead of being sent — so no real mail leaves a developer machine.
"""
import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger("mop.mail")


def _log_email(to: list[str], subject: str, body: str, reason: str) -> None:
    banner = "=" * 72
    logger.info(
        "\n%s\n[DEV EMAIL - not sent: %s]\nTo:      %s\nSubject: %s\n%s\n%s\n%s",
        banner, reason, ", ".join(to), subject, "-" * 72, body.strip(), banner,
    )


def send_email(to: str | list[str], subject: str, body: str) -> bool:
    """Send an email. Returns True if it was actually handed to an SMTP server.

    Never raises — a mail failure must not break the request that triggered it.
    """
    recipients = [to] if isinstance(to, str) else list(to)
    recipients = [r for r in recipients if r]
    if not recipients:
        logger.warning("send_email called with no recipients (subject=%r)", subject)
        return False

    if settings.is_dev or not settings.SMTP_HOST:
        reason = "APP_ENV=dev" if settings.is_dev else "SMTP_HOST not configured"
        _log_email(recipients, subject, body, reason)
        return False

    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = ", ".join(recipients)
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASS)
            smtp.send_message(msg)
        logger.info("Email sent to %s (subject=%r)", recipients, subject)
        return True
    except Exception:
        logger.exception("Failed to send email to %s (subject=%r)", recipients, subject)
        _log_email(recipients, subject, body, "SMTP send failed")
        return False


def send_password_reset(to: str, name: str, raw_token: str) -> bool:
    link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={raw_token}"
    body = f"""Hi {name},

We received a request to reset your MOP Careers password.

Reset it here (link expires in {settings.RESET_TOKEN_EXPIRE_MINUTES} minutes):
{link}

If you did not request this, you can safely ignore this email — your password
will stay unchanged.

— MOP Careers
"""
    return send_email(to, "Reset your MOP Careers password", body)


def send_new_account(to: str, name: str, role: str, temp_password: str) -> bool:
    login_url = f"{settings.FRONTEND_URL.rstrip('/')}/login"
    body = f"""Hi {name},

An MOP Careers {role} account has been created for you.

    Login: {login_url}
    Email: {to}
    Temporary password: {temp_password}

You will be asked to choose a new password the first time you sign in.

— MOP Careers
"""
    return send_email(to, "Your MOP Careers account", body)
