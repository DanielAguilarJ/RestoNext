"""
RestoNext MX - Finkok PAC Provider
Production integration with Finkok stamping service
"""

import base64
import httpx
from typing import Optional
from datetime import datetime

from .base import (
    PACProvider, PACResponse, CancelResponse,
    SATError, PACConnectionError, PACAuthenticationError,
    raise_sat_error
)


class FinkokProvider(PACProvider):
    """
    Finkok PAC provider implementation.
    
    Uses Finkok's REST API for stamping and cancellation.
    Docs: https://wiki.finkok.com/
    
    Environment variables needed:
    - FINKOK_USERNAME
    - FINKOK_PASSWORD
    - FINKOK_SANDBOX (true/false)
    """
    
    # API endpoints
    SANDBOX_URL = "https://demo-facturacion.finkok.com"
    PRODUCTION_URL = "https://facturacion.finkok.com"
    
    def __init__(
        self, 
        username: str, 
        password: str, 
        sandbox: bool = True
    ):
        self.username = username
        self.password = password
        self.sandbox = sandbox
        self.base_url = self.SANDBOX_URL if sandbox else self.PRODUCTION_URL
    
    async def stamp_xml(self, xml_content: str) -> PACResponse:
        """
        Send XML to Finkok for stamping (timbrado).
        
        Finkok expects the XML as base64 encoded string.
        """
        # Encode XML to base64
        xml_b64 = base64.b64encode(xml_content.encode('utf-8')).decode('utf-8')
        
        payload = {
            "username": self.username,
            "password": self.password,
            "xml": xml_b64,
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/servicios/soap/stamp",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 401:
                    raise PACAuthenticationError(
                        "Credenciales de Finkok inválidas"
                    )
                
                if response.status_code != 200:
                    raise PACConnectionError(
                        f"Error de conexión con Finkok: {response.status_code}"
                    )
                
                data = response.json()
                
                # Check for SAT errors
                if data.get("CodEstatus"):
                    code = data.get("CodEstatus")
                    message = data.get("Incidencias", [{}])[0].get("MensajeIncidencia", "")
                    raise_sat_error(code, message)
                
                # Success
                return PACResponse(
                    success=True,
                    uuid=data.get("UUID"),
                    xml_timbrado=base64.b64decode(
                        data.get("xml", "")
                    ).decode('utf-8') if data.get("xml") else None,
                    cadena_original=data.get("CadenaOriginalSAT"),
                    fecha_timbrado=data.get("FechaTimbrado"),
                    sello_sat=data.get("SelloSAT"),
                    sello_cfd=data.get("SelloCFD"),
                    no_certificado_sat=data.get("NoCertificadoSAT"),
                )
                
        except httpx.TimeoutException:
            raise PACConnectionError("Timeout al conectar con Finkok")
        except httpx.RequestError as e:
            raise PACConnectionError(f"Error de red: {str(e)}")
    
    async def cancel_uuid(
        self,
        uuid: str,
        rfc_emisor: str,
        rfc_receptor: str,
        total: float,
        motivo: str = "02",
    ) -> CancelResponse:
        """
        Cancel a CFDI via Finkok.
        
        Motivo codes:
        - 01: Comprobante emitido con errores con relación
        - 02: Comprobante emitido con errores sin relación
        - 03: No se llevó a cabo la operación
        - 04: Operación nominativa relacionada en factura global
        """
        payload = {
            "username": self.username,
            "password": self.password,
            "uuid": uuid,
            "rfc": rfc_emisor,
            "motivo": motivo,
            "foliosust": "",  # UUID sustituto si aplica
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/servicios/soap/cancel",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 401:
                    raise PACAuthenticationError(
                        "Credenciales de Finkok inválidas"
                    )
                
                if response.status_code != 200:
                    raise PACConnectionError(
                        f"Error de conexión: {response.status_code}"
                    )
                
                data = response.json()
                
                # Check for errors
                if data.get("CodEstatus"):
                    return CancelResponse(
                        success=False,
                        error_code=data.get("CodEstatus"),
                        error_message=data.get("MensajeIncidencia", ""),
                    )
                
                return CancelResponse(
                    success=True,
                    acuse=data.get("Acuse"),
                    fecha_cancelacion=datetime.now().isoformat(),
                    estatus=data.get("EstatusCancelacion", "Cancelado"),
                )
                
        except httpx.TimeoutException:
            raise PACConnectionError("Timeout al conectar con Finkok")
        except httpx.RequestError as e:
            raise PACConnectionError(f"Error de red: {str(e)}")
    
    async def get_status(self, uuid: str, rfc_emisor: str) -> dict:
        """
        Query CFDI status from SAT via Finkok.
        """
        payload = {
            "username": self.username,
            "password": self.password,
            "uuid": uuid,
            "rfc": rfc_emisor,
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/servicios/soap/satquery",
                    json=payload,
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "uuid": uuid,
                        "status": data.get("Estado", "unknown"),
                        "cancelable": data.get("EsCancelable", "unknown"),
                        "estatus_cancelacion": data.get("EstatusCancelacion"),
                    }
                    
        except Exception:
            pass
        
        return {"uuid": uuid, "status": "unknown"}
