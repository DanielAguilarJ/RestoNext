"""
RestoNext MX - PAC Provider Base Classes
Abstract adapter pattern for multiple PAC integrations
"""

from abc import ABC, abstractmethod
from typing import Optional
from pydantic import BaseModel


# ============================================
# Response Models
# ============================================

class PACResponse(BaseModel):
    """Response from PAC stamping operation"""
    success: bool
    uuid: Optional[str] = None
    xml_timbrado: Optional[str] = None
    cadena_original: Optional[str] = None
    fecha_timbrado: Optional[str] = None
    sello_sat: Optional[str] = None
    sello_cfd: Optional[str] = None
    no_certificado_sat: Optional[str] = None
    pdf_url: Optional[str] = None
    xml_url: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class CancelResponse(BaseModel):
    """Response from PAC cancel operation"""
    success: bool
    acuse: Optional[str] = None
    fecha_cancelacion: Optional[str] = None
    estatus: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


# ============================================
# SAT Error Exceptions
# ============================================

class SATError(Exception):
    """Base exception for SAT/PAC related errors"""
    sat_code: Optional[str] = None
    
    def __init__(self, message: str, sat_code: str = None):
        self.sat_code = sat_code
        super().__init__(message)


class XMLValidationError(SATError):
    """SAT Code 301: XML structure or schema invalid"""
    pass


class CSDRevokedError(SATError):
    """SAT Code 302: CSD certificate has been revoked"""
    pass


class InvalidRFCError(SATError):
    """SAT Code 303: RFC not registered with SAT or invalid format"""
    pass


class DuplicateUUIDError(SATError):
    """SAT Code 305: CFDI already stamped (duplicate)"""
    pass


class InvalidTimestampError(SATError):
    """SAT Code 401: Timestamp out of valid range"""
    pass


class CSDExpiredError(SATError):
    """SAT Code 304: CSD certificate has expired"""
    pass


class RFCMismatchError(SATError):
    """RFC in XML doesn't match CSD certificate"""
    pass


class PACConnectionError(SATError):
    """Failed to connect to PAC service"""
    pass


class PACAuthenticationError(SATError):
    """Invalid PAC credentials"""
    pass


# ============================================
# SAT Error Code Mappings
# ============================================

SAT_ERROR_MAP = {
    "301": (XMLValidationError, "Estructura del XML inválida"),
    "302": (CSDRevokedError, "El CSD del emisor ha sido revocado"),
    "303": (InvalidRFCError, "RFC no registrado en el SAT"),
    "304": (CSDExpiredError, "El CSD del emisor ha expirado"),
    "305": (DuplicateUUIDError, "El CFDI ya fue timbrado anteriormente"),
    "401": (InvalidTimestampError, "Fecha fuera del rango permitido"),
}


def raise_sat_error(code: str, message: str = None) -> None:
    """
    Raise appropriate exception based on SAT error code.
    """
    if code in SAT_ERROR_MAP:
        error_class, default_msg = SAT_ERROR_MAP[code]
        raise error_class(message or default_msg, sat_code=code)
    else:
        raise SATError(message or f"Error SAT: {code}", sat_code=code)


# ============================================
# Abstract PAC Provider
# ============================================

class PACProvider(ABC):
    """
    Abstract base class for PAC (Proveedor Autorizado de Certificación) providers.
    
    Implement this interface to add support for different PAC services:
    - Finkok
    - Facturama
    - SW Sapien
    - Diverza
    """
    
    @abstractmethod
    async def stamp_xml(
        self, 
        xml_content: str,
    ) -> PACResponse:
        """
        Send XML to PAC for stamping (timbrado).
        
        Args:
            xml_content: Pre-signed CFDI XML string
            
        Returns:
            PACResponse with stamped XML and UUID
            
        Raises:
            SATError: On validation or processing errors
            PACConnectionError: On network failures
        """
        pass
    
    @abstractmethod
    async def cancel_uuid(
        self,
        uuid: str,
        rfc_emisor: str,
        rfc_receptor: str,
        total: float,
        motivo: str = "02",  # 02 = Comprobante emitido con errores con relación
    ) -> CancelResponse:
        """
        Cancel a previously stamped CFDI.
        
        Args:
            uuid: UUID of the CFDI to cancel
            rfc_emisor: Issuer RFC
            rfc_receptor: Receiver RFC
            total: Total amount of the CFDI
            motivo: SAT cancellation reason code (01, 02, 03, 04)
            
        Returns:
            CancelResponse with cancellation acknowledgment
        """
        pass
    
    async def get_status(self, uuid: str, rfc_emisor: str) -> dict:
        """
        Get current status of a CFDI from SAT.
        Optional method - returns basic info by default.
        """
        return {"uuid": uuid, "status": "unknown"}
