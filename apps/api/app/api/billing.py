"""
RestoNext MX - Billing/CFDI API Routes
Self-invoicing (autofactura) endpoints for customers
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_onboarding_complete
from app.models.models import User, Order, Invoice, Tenant, CFDIStatus
from app.schemas.schemas import SelfInvoiceRequest, InvoiceResponse
from app.services.cfdi_service import (
    validate_cfdi_fields,
    generate_cfdi_xml,
    stamp_cfdi_with_pac,
)

router = APIRouter(prefix="/billing", tags=["Billing - CFDI"])


@router.post("/self-invoice", response_model=InvoiceResponse)
async def create_self_invoice(
    invoice_request: SelfInvoiceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_onboarding_complete),
):
    """
    Create a customer self-invoice (autofactura).
    
    This endpoint:
    1. Validates RFC, Razón Social, and CP against SAT rules
    2. Auto-cleans Razón Social (removes "SA de CV", etc.)
    3. Generates CFDI 4.0 XML
    4. Sends to PAC for stamping (mocked)
    
    Common validation errors:
    - RFC format invalid
    - Razón Social contains régimen societario
    - CP doesn't match fiscal address
    """
    # Get order with items
    result = await db.execute(
        select(Order)
        .where(Order.id == invoice_request.order_id)
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status.value != "paid":
        raise HTTPException(
            status_code=400, 
            detail="Order must be paid before invoicing"
        )
    
    # Check if invoice already exists
    existing = await db.execute(
        select(Invoice).where(
            Invoice.order_id == order.id,
            Invoice.status == CFDIStatus.STAMPED,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Invoice already exists for this order"
        )
    
    # Get tenant fiscal config
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == order.tenant_id)
    )
    tenant = tenant_result.scalar_one_or_none()
    
    if not tenant or not tenant.onboarding_complete:
         raise HTTPException(
            status_code=400,
            detail="Restaurant onboarding not complete. Cannot issue invoices."
        )
    
    # Validate customer data
    validation = validate_cfdi_fields(
        rfc=invoice_request.receptor_rfc,
        nombre=invoice_request.receptor_nombre,
        codigo_postal=invoice_request.receptor_cp,
    )
    
    if not validation.is_valid:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "CFDI validation failed",
                "errors": validation.errors,
            }
        )
    
    # Build conceptos from order items
    conceptos = []
    for item in order.items:
        conceptos.append({
            "clave_prod_serv": "90101500",  # Servicios de restaurante
            "cantidad": item.quantity,
            "clave_unidad": "ACT",  # Actividad
            "descripcion": item.menu_item_name,
            "valor_unitario": item.unit_price,
            "importe": item.unit_price * item.quantity,
        })
    
    # Generate CFDI XML
    # Using new structured fields from onboarding
    xml_content = generate_cfdi_xml(
        emisor_rfc=tenant.rfc,
        emisor_nombre=tenant.legal_name,
        emisor_regimen=tenant.regimen_fiscal,
        receptor_rfc=invoice_request.receptor_rfc.upper(),
        receptor_nombre=validation.cleaned_nombre,  # Use cleaned name
        receptor_cp=invoice_request.receptor_cp,
        uso_cfdi=invoice_request.uso_cfdi,
        conceptos=conceptos,
        subtotal=order.subtotal,
        total=order.total,
    )
    
    # Send to PAC for stamping
    # Check billing_config for PAC provider, default to mock
    billing_config = tenant.billing_config or {}
    pac_provider = billing_config.get("pac_provider", "mock")
    
    pac_response = await stamp_cfdi_with_pac(
        xml_content,
        pac_provider
    )
    
    if not pac_response.success:
        # Create failed invoice record
        invoice = Invoice(
            order_id=order.id,
            tenant_id=order.tenant_id,
            status=CFDIStatus.ERROR,
            receptor_rfc=invoice_request.receptor_rfc.upper(),
            receptor_nombre=validation.cleaned_nombre,
            receptor_cp=invoice_request.receptor_cp,
            uso_cfdi=invoice_request.uso_cfdi,
            subtotal=order.subtotal,
            iva=order.tax,
            total=order.total,
            sat_response={"error": pac_response.error_message},
        )
        db.add(invoice)
        await db.commit()
        
        raise HTTPException(
            status_code=500,
            detail=f"PAC stamping failed: {pac_response.error_message}"
        )
    
    # Create successful invoice record
    invoice = Invoice(
        order_id=order.id,
        tenant_id=order.tenant_id,
        uuid=pac_response.uuid,
        status=CFDIStatus.STAMPED,
        receptor_rfc=invoice_request.receptor_rfc.upper(),
        receptor_nombre=validation.cleaned_nombre,
        receptor_cp=invoice_request.receptor_cp,
        uso_cfdi=invoice_request.uso_cfdi,
        subtotal=order.subtotal,
        iva=order.tax,
        total=order.total,
        pdf_url=pac_response.pdf_url,
        xml_url=pac_response.xml_url,
        sat_response={"uuid": pac_response.uuid},
    )
    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)
    
    return invoice


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get invoice by ID"""
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return invoice


@router.get("/order/{order_id}/invoices", response_model=list[InvoiceResponse])
async def get_order_invoices(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all invoices for an order"""
    result = await db.execute(
        select(Invoice).where(Invoice.order_id == order_id)
    )
    return result.scalars().all()
