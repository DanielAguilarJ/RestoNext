"""
RestoNext MX - Legal & Compliance Module (Stripe Ready)
========================================================
Endpoints for managing Terms of Service, Privacy Policy,
and user acceptance tracking for Stripe compliance.

STRIPE REQUIREMENT:
All payment platforms require proof that users accepted the current
Terms of Service. This module provides:
1. Versioned legal documents storage
2. User acceptance tracking with IP and timestamp
3. API to check if user has accepted latest terms
"""

from datetime import datetime
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import User, LegalDocument, LegalAcceptance

router = APIRouter(prefix="/legal", tags=["Legal"])


# ============================================
# Pydantic Schemas
# ============================================

class LegalDocumentResponse(BaseModel):
    id: str
    type: str  # 'terms' or 'privacy'
    version: str
    title: str
    content: str  # Markdown content
    effective_date: datetime
    is_current: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LegalAcceptanceRequest(BaseModel):
    document_id: str


class LegalAcceptanceResponse(BaseModel):
    id: str
    document_id: str
    document_type: str
    document_version: str
    accepted_at: datetime
    ip_address: Optional[str]

    class Config:
        from_attributes = True


class AcceptanceStatusResponse(BaseModel):
    terms_accepted: bool
    terms_version: Optional[str]
    terms_accepted_at: Optional[datetime]
    privacy_accepted: bool
    privacy_version: Optional[str]
    privacy_accepted_at: Optional[datetime]
    requires_acceptance: bool


class LegalDocumentCreateRequest(BaseModel):
    type: str  # 'terms' or 'privacy'
    version: str
    title: str
    content: str  # Markdown content
    effective_date: Optional[datetime] = None
    set_as_current: bool = True


# ============================================
# Public Endpoints (No Auth Required)
# ============================================

@router.get("/latest/{doc_type}", response_model=LegalDocumentResponse)
async def get_latest_legal_document(
    doc_type: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get the latest version of a legal document (terms or privacy).
    This is a PUBLIC endpoint - no authentication required.
    
    Args:
        doc_type: Either 'terms' or 'privacy'
    
    Returns:
        The current legal document with markdown content
    """
    if doc_type not in ['terms', 'privacy']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document type must be 'terms' or 'privacy'"
        )
    
    result = await db.execute(
        select(LegalDocument)
        .where(LegalDocument.type == doc_type)
        .where(LegalDocument.is_current == True)
        .limit(1)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        # Return default terms if none exist
        return LegalDocumentResponse(
            id=str(uuid.uuid4()),
            type=doc_type,
            version="1.0.0",
            title="Términos y Condiciones" if doc_type == 'terms' else "Política de Privacidad",
            content=get_default_document_content(doc_type),
            effective_date=datetime.utcnow(),
            is_current=True,
            created_at=datetime.utcnow()
        )
    
    return LegalDocumentResponse(
        id=str(document.id),
        type=document.type,
        version=document.version,
        title=document.title,
        content=document.content,
        effective_date=document.effective_date,
        is_current=document.is_current,
        created_at=document.created_at
    )


@router.get("/document/{document_id}", response_model=LegalDocumentResponse)
async def get_legal_document_by_id(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific legal document by ID.
    Useful for showing what version a user accepted.
    """
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document ID format"
        )
    
    result = await db.execute(
        select(LegalDocument).where(LegalDocument.id == doc_uuid)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return LegalDocumentResponse(
        id=str(document.id),
        type=document.type,
        version=document.version,
        title=document.title,
        content=document.content,
        effective_date=document.effective_date,
        is_current=document.is_current,
        created_at=document.created_at
    )


# ============================================
# Authenticated Endpoints
# ============================================

@router.post("/accept", response_model=LegalAcceptanceResponse)
async def accept_legal_document(
    request: Request,
    acceptance_data: LegalAcceptanceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Record user acceptance of a legal document.
    Captures IP address and timestamp for Stripe compliance.
    
    This is the critical endpoint for legal compliance:
    - Records that the user explicitly accepted
    - Stores IP for audit trail
    - Links to specific document version
    """
    try:
        doc_uuid = uuid.UUID(acceptance_data.document_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document ID format"
        )
    
    # Verify document exists
    result = await db.execute(
        select(LegalDocument).where(LegalDocument.id == doc_uuid)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Get client IP (handle proxies)
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    
    # Check if already accepted this version
    existing = await db.execute(
        select(LegalAcceptance)
        .where(LegalAcceptance.user_id == current_user.id)
        .where(LegalAcceptance.document_id == doc_uuid)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already accepted this document version"
        )
    
    # Create acceptance record
    acceptance = LegalAcceptance(
        user_id=current_user.id,
        document_id=doc_uuid,
        ip_address=client_ip,
        user_agent=request.headers.get("User-Agent", "unknown")[:500],
    )
    
    db.add(acceptance)
    await db.commit()
    await db.refresh(acceptance)
    
    return LegalAcceptanceResponse(
        id=str(acceptance.id),
        document_id=str(document.id),
        document_type=document.type,
        document_version=document.version,
        accepted_at=acceptance.accepted_at,
        ip_address=acceptance.ip_address
    )


@router.get("/acceptance-status", response_model=AcceptanceStatusResponse)
async def get_acceptance_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Check if user has accepted the latest terms and privacy policy.
    Used by frontend to block access until acceptance.
    """
    # Get current documents
    terms_result = await db.execute(
        select(LegalDocument)
        .where(LegalDocument.type == 'terms')
        .where(LegalDocument.is_current == True)
    )
    current_terms = terms_result.scalar_one_or_none()
    
    privacy_result = await db.execute(
        select(LegalDocument)
        .where(LegalDocument.type == 'privacy')
        .where(LegalDocument.is_current == True)
    )
    current_privacy = privacy_result.scalar_one_or_none()
    
    # Check acceptances
    terms_accepted = False
    terms_version = None
    terms_accepted_at = None
    
    privacy_accepted = False
    privacy_version = None
    privacy_accepted_at = None
    
    if current_terms:
        acceptance_result = await db.execute(
            select(LegalAcceptance)
            .where(LegalAcceptance.user_id == current_user.id)
            .where(LegalAcceptance.document_id == current_terms.id)
        )
        terms_acceptance = acceptance_result.scalar_one_or_none()
        if terms_acceptance:
            terms_accepted = True
            terms_version = current_terms.version
            terms_accepted_at = terms_acceptance.accepted_at
    else:
        # No terms defined yet, consider as accepted
        terms_accepted = True
    
    if current_privacy:
        acceptance_result = await db.execute(
            select(LegalAcceptance)
            .where(LegalAcceptance.user_id == current_user.id)
            .where(LegalAcceptance.document_id == current_privacy.id)
        )
        privacy_acceptance = acceptance_result.scalar_one_or_none()
        if privacy_acceptance:
            privacy_accepted = True
            privacy_version = current_privacy.version
            privacy_accepted_at = privacy_acceptance.accepted_at
    else:
        # No privacy policy defined yet, consider as accepted
        privacy_accepted = True
    
    return AcceptanceStatusResponse(
        terms_accepted=terms_accepted,
        terms_version=terms_version,
        terms_accepted_at=terms_accepted_at,
        privacy_accepted=privacy_accepted,
        privacy_version=privacy_version,
        privacy_accepted_at=privacy_accepted_at,
        requires_acceptance=not (terms_accepted and privacy_accepted)
    )


# ============================================
# Admin Endpoints (Create/Update Documents)
# ============================================

@router.post("/documents", response_model=LegalDocumentResponse)
async def create_legal_document(
    doc_data: LegalDocumentCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new legal document version.
    Only ADMIN users can create documents.
    """
    if current_user.role.value != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create legal documents"
        )
    
    if doc_data.type not in ['terms', 'privacy']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document type must be 'terms' or 'privacy'"
        )
    
    # If setting as current, mark all others as not current
    if doc_data.set_as_current:
        await db.execute(
            LegalDocument.__table__.update()
            .where(LegalDocument.type == doc_data.type)
            .values(is_current=False)
        )
    
    document = LegalDocument(
        type=doc_data.type,
        version=doc_data.version,
        title=doc_data.title,
        content=doc_data.content,
        effective_date=doc_data.effective_date or datetime.utcnow(),
        is_current=doc_data.set_as_current,
    )
    
    db.add(document)
    await db.commit()
    await db.refresh(document)
    
    return LegalDocumentResponse(
        id=str(document.id),
        type=document.type,
        version=document.version,
        title=document.title,
        content=document.content,
        effective_date=document.effective_date,
        is_current=document.is_current,
        created_at=document.created_at
    )


# ============================================
# Helper Functions
# ============================================

def get_default_document_content(doc_type: str) -> str:
    """Return default legal document content in Markdown format."""
    if doc_type == 'terms':
        return """# Términos y Condiciones de Servicio

**Última actualización:** Enero 2026

## 1. Aceptación de los Términos

Al acceder y utilizar RestoNext MX ("el Servicio"), usted acepta estar sujeto a estos Términos y Condiciones de Servicio. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestro servicio.

## 2. Descripción del Servicio

RestoNext MX es una plataforma SaaS de gestión de restaurantes que incluye:
- Sistema de Punto de Venta (POS)
- Gestión de inventario
- Facturación electrónica (CFDI 4.0)
- Reservaciones y fidelización de clientes

## 3. Uso del Servicio

### 3.1 Cuenta de Usuario
- Usted es responsable de mantener la confidencialidad de su cuenta
- Debe proporcionar información precisa y actualizada
- No puede compartir sus credenciales de acceso

### 3.2 Conducta Prohibida
- Uso del servicio para actividades ilegales
- Interferir con la operación del servicio
- Intentar acceder a cuentas de otros usuarios

## 4. Pagos y Facturación

- Los cargos se realizan según el plan seleccionado
- Los pagos son procesados por Stripe de forma segura
- Las facturas se emiten mensualmente

## 5. Privacidad y Datos

El uso de sus datos personales está regido por nuestra Política de Privacidad.

## 6. Limitación de Responsabilidad

RestoNext MX no será responsable por daños indirectos, incidentales o consecuentes derivados del uso del servicio.

## 7. Modificaciones

Nos reservamos el derecho de modificar estos términos. Los cambios serán notificados y requerirán nueva aceptación.

## 8. Contacto

Para preguntas sobre estos términos, contáctenos en: legal@restonext.mx
"""
    else:  # privacy
        return """# Política de Privacidad

**Última actualización:** Enero 2026

## 1. Información que Recopilamos

### 1.1 Información Proporcionada
- Datos de registro (nombre, email, teléfono)
- Datos fiscales para facturación (RFC, razón social)
- Información de pago (procesada por Stripe)

### 1.2 Información Automática
- Dirección IP
- Tipo de navegador y dispositivo
- Páginas visitadas y tiempo de uso

## 2. Uso de la Información

Utilizamos su información para:
- Proporcionar y mejorar nuestros servicios
- Procesar pagos y facturación
- Comunicaciones sobre el servicio
- Cumplimiento regulatorio

## 3. Compartición de Datos

No vendemos su información personal. Compartimos datos solo con:
- Stripe (procesamiento de pagos)
- Proveedores de PAC (facturación electrónica)
- Autoridades cuando sea requerido por ley

## 4. Seguridad

Implementamos medidas de seguridad incluyendo:
- Encriptación SSL/TLS
- Acceso restringido a datos
- Monitoreo de seguridad continuo

## 5. Sus Derechos (LFPDPPP)

Conforme a la Ley Federal de Protección de Datos, usted tiene derecho a:
- **Acceso:** Conocer qué datos tenemos sobre usted
- **Rectificación:** Corregir datos inexactos
- **Cancelación:** Solicitar eliminación de datos
- **Oposición:** Oponerse al tratamiento de datos

## 6. Retención de Datos

Conservamos sus datos durante la vigencia de su cuenta y por el período requerido por ley (5 años para datos fiscales).

## 7. Cookies

Utilizamos cookies esenciales para el funcionamiento del servicio.

## 8. Cambios a esta Política

Notificaremos cambios materiales por email y en la plataforma.

## 9. Contacto

Oficial de Privacidad: privacidad@restonext.mx
"""
