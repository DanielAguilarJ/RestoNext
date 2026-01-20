"""
RestoNext MX - Email Service
=============================
Transactional email service using FastAPI-Mail with Jinja2 templates.

Features:
- SMTP configuration (Gmail, Outlook, custom SMTP)
- HTML email templates with Jinja2
- Async email sending
- Welcome emails with credentials
- Password reset emails
- Order confirmation emails

Configuration (Environment Variables):
- SMTP_HOST: SMTP server host
- SMTP_PORT: SMTP server port (587 for TLS, 465 for SSL)
- SMTP_USER: SMTP username/email
- SMTP_PASSWORD: SMTP password or app-specific password
- SMTP_FROM_EMAIL: Sender email address
- SMTP_FROM_NAME: Sender display name
- SMTP_TLS: Use TLS (true/false)
- SMTP_SSL: Use SSL (true/false)

Author: RestoNext Team
"""

import os
from pathlib import Path
from typing import Optional, List, Dict, Any
import logging

from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from jinja2 import Environment, FileSystemLoader, select_autoescape

# Configure logging
logger = logging.getLogger("email_service")

# ============================================
# Email Configuration
# ============================================

def get_email_config() -> Optional[ConnectionConfig]:
    """
    Create email configuration from environment variables.
    Returns None if required variables are not set.
    """
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    
    if not all([smtp_host, smtp_user, smtp_password]):
        logger.warning("Email service disabled: SMTP configuration incomplete")
        return None
    
    return ConnectionConfig(
        MAIL_USERNAME=smtp_user,
        MAIL_PASSWORD=smtp_password,
        MAIL_FROM=os.getenv("SMTP_FROM_EMAIL", smtp_user),
        MAIL_FROM_NAME=os.getenv("SMTP_FROM_NAME", "RestoNext MX"),
        MAIL_PORT=int(os.getenv("SMTP_PORT", "587")),
        MAIL_SERVER=smtp_host,
        MAIL_STARTTLS=os.getenv("SMTP_TLS", "true").lower() == "true",
        MAIL_SSL_TLS=os.getenv("SMTP_SSL", "false").lower() == "true",
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
        TEMPLATE_FOLDER=Path(__file__).parent.parent / "templates" / "email"
    )


# ============================================
# Jinja2 Template Engine
# ============================================

# Set up Jinja2 environment for email templates
TEMPLATE_DIR = Path(__file__).parent.parent / "templates" / "email"
TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)

jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATE_DIR)),
    autoescape=select_autoescape(['html', 'xml'])
)


# ============================================
# Email Service Class
# ============================================

class EmailService:
    """
    Main email service for sending transactional emails.
    Gracefully handles missing SMTP configuration.
    """
    
    def __init__(self):
        self.config = get_email_config()
        self.enabled = self.config is not None
        
        if self.enabled:
            self.mail = FastMail(self.config)
            logger.info("✅ Email service initialized successfully")
        else:
            self.mail = None
            logger.warning("⚠️ Email service disabled - SMTP not configured")
    
    async def send_email(
        self,
        to: List[str],
        subject: str,
        template_name: str,
        template_data: Dict[str, Any],
        attachments: Optional[List] = None
    ) -> bool:
        """
        Send an email using a Jinja2 template.
        
        Args:
            to: List of recipient email addresses
            subject: Email subject line
            template_name: Name of the template file (without path)
            template_data: Dictionary of variables to pass to template
            attachments: Optional list of attachments
            
        Returns:
            True if email sent successfully, False otherwise
        """
        if not self.enabled:
            logger.warning(f"Email not sent (disabled): {subject} -> {to}")
            # Log the content for debugging in dev
            logger.debug(f"Template: {template_name}, Data: {template_data}")
            return False
        
        try:
            # Render the template
            template = jinja_env.get_template(template_name)
            html_content = template.render(**template_data)
            
            # Create message
            message = MessageSchema(
                subject=subject,
                recipients=to,
                body=html_content,
                subtype=MessageType.html,
                attachments=attachments or []
            )
            
            # Send the email
            await self.mail.send_message(message)
            
            logger.info(f"✅ Email sent: {subject} -> {to}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to send email: {str(e)}")
            return False
    
    async def send_welcome_email(
        self,
        to_email: str,
        tenant_name: str,
        admin_name: str,
        email: str,
        password: str,
        login_url: str = "https://restonext.vercel.app/login"
    ) -> bool:
        """
        Send welcome email with login credentials to new tenant admin.
        
        Args:
            to_email: Recipient email address
            tenant_name: Name of the restaurant/tenant
            admin_name: Name of the admin user
            email: Login email
            password: Initial password
            login_url: URL to the login page
            
        Returns:
            True if sent successfully
        """
        return await self.send_email(
            to=[to_email],
            subject=f"🍽️ Bienvenido a RestoNext - {tenant_name}",
            template_name="welcome.html",
            template_data={
                "tenant_name": tenant_name,
                "admin_name": admin_name,
                "email": email,
                "password": password,
                "login_url": login_url,
                "year": "2026"
            }
        )
    
    async def send_password_reset_email(
        self,
        to_email: str,
        user_name: str,
        reset_token: str,
        reset_url: str
    ) -> bool:
        """
        Send password reset email.
        
        Args:
            to_email: Recipient email address
            user_name: User's display name
            reset_token: Password reset token
            reset_url: Base URL for password reset
            
        Returns:
            True if sent successfully
        """
        return await self.send_email(
            to=[to_email],
            subject="🔐 Restablecer Contraseña - RestoNext",
            template_name="password_reset.html",
            template_data={
                "user_name": user_name,
                "reset_link": f"{reset_url}?token={reset_token}",
                "year": "2026"
            }
        )
    
    async def send_order_confirmation_email(
        self,
        to_email: str,
        customer_name: str,
        order_id: str,
        order_items: List[Dict],
        total: float,
        restaurant_name: str
    ) -> bool:
        """
        Send order confirmation email to customer.
        
        Args:
            to_email: Customer email address
            customer_name: Customer's name
            order_id: Order reference ID
            order_items: List of items with name, quantity, price
            total: Order total amount
            restaurant_name: Name of the restaurant
            
        Returns:
            True if sent successfully
        """
        return await self.send_email(
            to=[to_email],
            subject=f"✅ Confirmación de Orden #{order_id} - {restaurant_name}",
            template_name="order_confirmation.html",
            template_data={
                "customer_name": customer_name,
                "order_id": order_id,
                "order_items": order_items,
                "total": f"${total:,.2f}",
                "restaurant_name": restaurant_name,
                "year": "2026"
            }
        )
    
    async def send_backup_notification_email(
        self,
        to_email: str,
        backup_filename: str,
        backup_size: str,
        status: str = "success",
        error_message: Optional[str] = None
    ) -> bool:
        """
        Send backup status notification to admin.
        
        Args:
            to_email: Admin email address
            backup_filename: Name of the backup file
            backup_size: Human-readable size of backup
            status: 'success' or 'failed'
            error_message: Error details if failed
            
        Returns:
            True if sent successfully
        """
        return await self.send_email(
            to=[to_email],
            subject=f"{'✅' if status == 'success' else '❌'} Backup DB - RestoNext",
            template_name="backup_notification.html",
            template_data={
                "backup_filename": backup_filename,
                "backup_size": backup_size,
                "status": status,
                "error_message": error_message,
                "year": "2026"
            }
        )
    
    # ============================================
    # Subscription Lifecycle Emails
    # ============================================
    
    async def send_welcome_email(
        self,
        to_email: str,
        name: str,
        restaurant_name: str,
        plan_name: str,
        login_url: str
    ) -> bool:
        """
        Send welcome email after successful subscription.
        
        Args:
            to_email: Recipient email address
            name: User's name
            restaurant_name: Restaurant name
            plan_name: Name of the subscribed plan
            login_url: URL to login page
            
        Returns:
            True if sent successfully
        """
        return await self.send_email(
            to=[to_email],
            subject=f"🎉 ¡Bienvenido a RestoNext {plan_name}! - {restaurant_name}",
            template_name="welcome_subscription.html",
            template_data={
                "name": name,
                "restaurant_name": restaurant_name,
                "plan_name": plan_name,
                "login_url": login_url,
                "year": "2026"
            }
        )
    
    async def send_payment_failed(
        self,
        to_email: str,
        name: str,
        restaurant_name: str,
        invoice_url: Optional[str] = None
    ) -> bool:
        """
        Send notification when payment fails.
        
        Args:
            to_email: Recipient email address
            name: User's name
            restaurant_name: Restaurant name
            invoice_url: URL to retry payment
            
        Returns:
            True if sent successfully
        """
        return await self.send_email(
            to=[to_email],
            subject=f"⚠️ Problema con tu pago - {restaurant_name}",
            template_name="payment_failed.html",
            template_data={
                "name": name,
                "restaurant_name": restaurant_name,
                "invoice_url": invoice_url or "",
                "year": "2026"
            }
        )
    
    async def send_subscription_canceled(
        self,
        to_email: str,
        name: str,
        restaurant_name: str
    ) -> bool:
        """
        Send notification when subscription is canceled.
        
        Args:
            to_email: Recipient email address
            name: User's name
            restaurant_name: Restaurant name
            
        Returns:
            True if sent successfully
        """
        return await self.send_email(
            to=[to_email],
            subject=f"Tu suscripción ha sido cancelada - {restaurant_name}",
            template_name="subscription_canceled.html",
            template_data={
                "name": name,
                "restaurant_name": restaurant_name,
                "year": "2026"
            }
        )


# ============================================
# Global Instance
# ============================================

# Singleton instance - lazy loaded
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """Get or create the email service singleton."""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
