"""
RestoNext MX - Mock PAC Provider
For development and testing without real PAC connection
"""

from uuid import uuid4
from datetime import datetime

from .base import PACProvider, PACResponse, CancelResponse


class MockProvider(PACProvider):
    """
    Mock PAC provider for development and testing.
    Returns successful responses with generated UUIDs.
    """
    
    async def stamp_xml(self, xml_content: str) -> PACResponse:
        """
        Simulate successful stamping with mock data.
        """
        mock_uuid = str(uuid4()).upper()
        fecha = datetime.now().isoformat()
        
        return PACResponse(
            success=True,
            uuid=mock_uuid,
            xml_timbrado=xml_content,
            cadena_original=f"||1.1|{mock_uuid}|{fecha}|...",
            fecha_timbrado=fecha,
            sello_sat="MOCK_SELLO_SAT_BASE64...",
            sello_cfd="MOCK_SELLO_CFD_BASE64...",
            no_certificado_sat="00001000000000000001",
            pdf_url=f"/storage/invoices/{mock_uuid}.pdf",
            xml_url=f"/storage/invoices/{mock_uuid}.xml",
        )
    
    async def cancel_uuid(
        self,
        uuid: str,
        rfc_emisor: str,
        rfc_receptor: str,
        total: float,
        motivo: str = "02",
    ) -> CancelResponse:
        """
        Simulate successful cancellation.
        """
        return CancelResponse(
            success=True,
            acuse=f"<Acuse><UUID>{uuid}</UUID><Status>Cancelado</Status></Acuse>",
            fecha_cancelacion=datetime.now().isoformat(),
            estatus="Cancelado",
        )
