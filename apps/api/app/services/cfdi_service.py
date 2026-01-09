"""
RestoNext MX - CFDI 4.0 Fiscal Service
Mexican tax invoice generation with PAC abstraction

KEY COMPLIANCE RULES (SAT Anexo 20):
1. Razón Social must NOT include "SA de CV", "S.A.", "S. de R.L." etc.
2. RFC must be 12 chars (moral) or 13 chars (física) with valid checksum
3. Código Postal must match receptor's fiscal address
"""

import re
from typing import Optional, Tuple
from datetime import datetime
from uuid import uuid4

from pydantic import BaseModel


class CFDIValidationResult(BaseModel):
    """Result of CFDI field validation"""
    is_valid: bool
    errors: list[str] = []
    cleaned_nombre: Optional[str] = None


class PACResponse(BaseModel):
    """Mock PAC (Proveedor Autorizado de Certificación) response"""
    success: bool
    uuid: Optional[str] = None
    xml_content: Optional[str] = None
    pdf_url: Optional[str] = None
    xml_url: Optional[str] = None
    error_message: Optional[str] = None


# Régimen societario patterns to remove from Razón Social
REGIMEN_SOCIETARIO_PATTERNS = [
    r",?\s*S\.?\s*A\.?\s*DE\s*C\.?\s*V\.?\s*$",
    r",?\s*S\.?\s*A\.?\s*$",
    r",?\s*S\.?\s*DE\s*R\.?\s*L\.?\s*DE\s*C\.?\s*V\.?\s*$",
    r",?\s*S\.?\s*DE\s*R\.?\s*L\.?\s*$",
    r",?\s*S\.?\s*C\.?\s*$",
    r",?\s*A\.?\s*C\.?\s*$",
    r",?\s*S\.?\s*EN\s*C\.?\s*$",
    r",?\s*S\.?\s*EN\s*N\.?\s*C\.?\s*$",
]


def clean_razon_social(nombre: str) -> str:
    """
    Remove régimen societario from Razón Social.
    SAT CFDI 4.0 requires the name WITHOUT "SA de CV", "S.A.", etc.
    
    Example:
        "RESTAURANTE MEXICANO SA DE CV" -> "RESTAURANTE MEXICANO"
    """
    cleaned = nombre.strip().upper()
    
    for pattern in REGIMEN_SOCIETARIO_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    
    # Remove extra whitespace and trailing punctuation
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    cleaned = re.sub(r"[,.\s]+$", "", cleaned)
    
    return cleaned


def validate_rfc(rfc: str) -> Tuple[bool, str]:
    """
    Validate Mexican RFC format.
    
    - Persona Moral: 12 characters (3 letters + 6 digits + 3 homoclave)
    - Persona Física: 13 characters (4 letters + 6 digits + 3 homoclave)
    """
    rfc = rfc.strip().upper()
    
    if len(rfc) not in (12, 13):
        return False, "RFC debe tener 12 o 13 caracteres"
    
    # Persona Moral pattern
    moral_pattern = r"^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$"
    # Persona Física pattern
    fisica_pattern = r"^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$"
    
    if len(rfc) == 12:
        if not re.match(moral_pattern, rfc):
            return False, "Formato de RFC de Persona Moral inválido"
    else:
        if not re.match(fisica_pattern, rfc):
            return False, "Formato de RFC de Persona Física inválido"
    
    return True, ""


def validate_codigo_postal(cp: str) -> Tuple[bool, str]:
    """Validate Mexican postal code (5 digits)"""
    cp = cp.strip()
    
    if not re.match(r"^\d{5}$", cp):
        return False, "Código Postal debe ser de 5 dígitos"
    
    return True, ""


def validate_cfdi_fields(
    rfc: str,
    nombre: str,
    codigo_postal: str,
) -> CFDIValidationResult:
    """
    Validate all CFDI receptor fields according to SAT rules.
    Returns cleaned nombre with régimen societario removed.
    """
    errors = []
    
    # Validate RFC
    rfc_valid, rfc_error = validate_rfc(rfc)
    if not rfc_valid:
        errors.append(rfc_error)
    
    # Validate CP
    cp_valid, cp_error = validate_codigo_postal(codigo_postal)
    if not cp_valid:
        errors.append(cp_error)
    
    # Clean and validate nombre
    cleaned_nombre = clean_razon_social(nombre)
    if not cleaned_nombre:
        errors.append("Razón Social no puede estar vacía")
    
    return CFDIValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
        cleaned_nombre=cleaned_nombre,
    )


def generate_cfdi_xml(
    emisor_rfc: str,
    emisor_nombre: str,
    emisor_regimen: str,
    receptor_rfc: str,
    receptor_nombre: str,
    receptor_cp: str,
    uso_cfdi: str,
    conceptos: list[dict],
    subtotal: float,
    total: float,
) -> str:
    """
    Generate CFDI 4.0 XML structure.
    
    NOTE: This is a MOCK implementation. In production, use a proper
    XML library with SAT schema validation and certificate signing.
    """
    # Generate unique folio
    folio = datetime.now().strftime("%Y%m%d%H%M%S")
    fecha = datetime.now().isoformat()
    
    # Build conceptos XML
    conceptos_xml = ""
    for c in conceptos:
        conceptos_xml += f"""
            <cfdi:Concepto
                ClaveProdServ="{c.get('clave_prod_serv', '90101500')}"
                Cantidad="{c['cantidad']}"
                ClaveUnidad="{c.get('clave_unidad', 'ACT')}"
                Descripcion="{c['descripcion']}"
                ValorUnitario="{c['valor_unitario']:.2f}"
                Importe="{c['importe']:.2f}">
                <cfdi:Impuestos>
                    <cfdi:Traslados>
                        <cfdi:Traslado
                            Base="{c['importe']:.2f}"
                            Impuesto="002"
                            TipoFactor="Tasa"
                            TasaOCuota="0.160000"
                            Importe="{c['importe'] * 0.16:.2f}"/>
                    </cfdi:Traslados>
                </cfdi:Impuestos>
            </cfdi:Concepto>"""
    
    iva = subtotal * 0.16
    
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd"
    Version="4.0"
    Serie="A"
    Folio="{folio}"
    Fecha="{fecha}"
    FormaPago="01"
    SubTotal="{subtotal:.2f}"
    Moneda="MXN"
    Total="{total:.2f}"
    TipoDeComprobante="I"
    Exportacion="01"
    MetodoPago="PUE"
    LugarExpedicion="{receptor_cp}">
    
    <cfdi:Emisor
        Rfc="{emisor_rfc}"
        Nombre="{emisor_nombre}"
        RegimenFiscal="{emisor_regimen}"/>
    
    <cfdi:Receptor
        Rfc="{receptor_rfc}"
        Nombre="{receptor_nombre}"
        DomicilioFiscalReceptor="{receptor_cp}"
        RegimenFiscalReceptor="616"
        UsoCFDI="{uso_cfdi}"/>
    
    <cfdi:Conceptos>
        {conceptos_xml}
    </cfdi:Conceptos>
    
    <cfdi:Impuestos TotalImpuestosTrasladados="{iva:.2f}">
        <cfdi:Traslados>
            <cfdi:Traslado
                Base="{subtotal:.2f}"
                Impuesto="002"
                TipoFactor="Tasa"
                TasaOCuota="0.160000"
                Importe="{iva:.2f}"/>
        </cfdi:Traslados>
    </cfdi:Impuestos>
    
</cfdi:Comprobante>"""
    
    return xml


async def stamp_cfdi_with_pac(xml_content: str, pac_provider: str = "mock") -> PACResponse:
    """
    Send XML to PAC for stamping.
    
    NOTE: This is a MOCK implementation. In production, integrate with
    real PAC providers like Facturama, Finkok, or SW Sapien.
    """
    # Mock successful stamping
    mock_uuid = str(uuid4()).upper()
    
    # In production, this would:
    # 1. Sign XML with CSD certificate
    # 2. Send to PAC API
    # 3. Receive timbrado (stamped) XML with UUID
    # 4. Generate PDF representation
    
    return PACResponse(
        success=True,
        uuid=mock_uuid,
        xml_content=xml_content,
        pdf_url=f"/storage/invoices/{mock_uuid}.pdf",
        xml_url=f"/storage/invoices/{mock_uuid}.xml",
    )
