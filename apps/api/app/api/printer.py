"""
RestoNext MX - Printer API Routes
Network printer proxy for browsers without direct TCP access
"""

import base64
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, field_validator

from app.core.security import get_current_user
from app.models.models import User
from app.services.printer_proxy import send_to_printer, test_printer_connection

router = APIRouter(prefix="/printer", tags=["Printing"])


# ============================================
# Schemas
# ============================================

class PrintRawRequest(BaseModel):
    """Request to print raw ESC/POS data to network printer"""
    ip: str = Field(..., description="Printer IP address")
    port: int = Field(default=9100, ge=1, le=65535, description="Printer port")
    data: str = Field(..., description="ESC/POS data encoded in base64")
    
    @field_validator('ip')
    @classmethod
    def validate_ip(cls, v: str) -> str:
        # Basic IP validation
        parts = v.split('.')
        if len(parts) != 4:
            raise ValueError("Invalid IP address format")
        for part in parts:
            try:
                num = int(part)
                if num < 0 or num > 255:
                    raise ValueError("Invalid IP address")
            except ValueError:
                raise ValueError("Invalid IP address")
        return v


class PrintRawResponse(BaseModel):
    success: bool
    message: str


class TestPrinterRequest(BaseModel):
    ip: str
    port: int = 9100


class TestPrinterResponse(BaseModel):
    reachable: bool
    message: str


# ============================================
# Endpoints
# ============================================

@router.post("/print-raw", response_model=PrintRawResponse)
async def print_raw(
    request: PrintRawRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Send raw ESC/POS data to a network printer.
    
    The browser cannot open TCP sockets directly for security,
    so this endpoint acts as a proxy to send print data to
    thermal printers on the local network.
    
    Data should be base64 encoded ESC/POS bytes.
    """
    try:
        # Decode base64 data
        raw_data = base64.b64decode(request.data)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid base64 data"
        )
    
    # Send to printer
    success, error = await send_to_printer(
        ip=request.ip,
        port=request.port,
        data=raw_data
    )
    
    if not success:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to print: {error}"
        )
    
    return PrintRawResponse(
        success=True,
        message=f"Data sent to printer at {request.ip}:{request.port}"
    )


@router.post("/test", response_model=TestPrinterResponse)
async def test_printer(
    request: TestPrinterRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Test if a network printer is reachable.
    """
    reachable, message = await test_printer_connection(
        ip=request.ip,
        port=request.port
    )
    
    return TestPrinterResponse(
        reachable=reachable,
        message=message
    )
