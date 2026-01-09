"""
RestoNext MX - Printer Proxy Service
TCP socket communication with network thermal printers
"""

import asyncio
import socket
from typing import Optional


async def send_to_printer(
    ip: str, 
    port: int, 
    data: bytes, 
    timeout: float = 5.0
) -> tuple[bool, Optional[str]]:
    """
    Send ESC/POS data to a network printer via TCP socket.
    
    Most thermal printers listen on port 9100 for raw data.
    
    Args:
        ip: Printer IP address (e.g., "192.168.1.200")
        port: Printer port (typically 9100)
        data: ESC/POS encoded bytes
        timeout: Connection timeout in seconds
    
    Returns:
        Tuple of (success, error_message)
    """
    try:
        # Create socket with timeout
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(ip, port),
            timeout=timeout
        )
        
        # Send data
        writer.write(data)
        await writer.drain()
        
        # Close connection
        writer.close()
        await writer.wait_closed()
        
        return True, None
        
    except asyncio.TimeoutError:
        return False, f"Connection to {ip}:{port} timed out after {timeout}s"
    except ConnectionRefusedError:
        return False, f"Connection refused by {ip}:{port}. Check if printer is on and IP is correct."
    except OSError as e:
        return False, f"Network error: {str(e)}"
    except Exception as e:
        return False, f"Unexpected error: {str(e)}"


def send_to_printer_sync(
    ip: str,
    port: int,
    data: bytes,
    timeout: float = 5.0
) -> tuple[bool, Optional[str]]:
    """
    Synchronous version for use in non-async contexts.
    """
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(timeout)
            sock.connect((ip, port))
            sock.sendall(data)
            return True, None
    except socket.timeout:
        return False, f"Connection to {ip}:{port} timed out"
    except ConnectionRefusedError:
        return False, f"Connection refused by {ip}:{port}"
    except OSError as e:
        return False, f"Network error: {str(e)}"


async def test_printer_connection(ip: str, port: int = 9100) -> tuple[bool, str]:
    """
    Test if a printer is reachable at the given IP and port.
    """
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(ip, port),
            timeout=3.0
        )
        writer.close()
        await writer.wait_closed()
        return True, "Printer is reachable"
    except asyncio.TimeoutError:
        return False, "Connection timed out"
    except ConnectionRefusedError:
        return False, "Connection refused"
    except Exception as e:
        return False, str(e)
