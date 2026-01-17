"""
RestoNext MX - Professional PDF Generation Service
====================================================
Uses ReportLab for generating beautiful catering proposals,
production sheets, and other business documents.

DESIGN PHILOSOPHY:
- Professional appearance that represents the restaurant's brand
- Clean typography with proper hierarchy
- Color-coded sections for easy scanning
- Mexican business standards compliance
"""

import io
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, HRFlowable, KeepTogether
)
from reportlab.graphics.shapes import Drawing, Line
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


# ============================================
# Color Palette (Professional & Modern)
# ============================================
class PDFColors:
    """Brand colors for consistent PDF styling"""
    PRIMARY = colors.HexColor('#10B981')      # Emerald green
    PRIMARY_DARK = colors.HexColor('#059669')  # Darker emerald
    SECONDARY = colors.HexColor('#1F2937')     # Dark gray
    ACCENT = colors.HexColor('#F59E0B')        # Amber
    TEXT_DARK = colors.HexColor('#111827')     # Near black
    TEXT_GRAY = colors.HexColor('#6B7280')     # Gray
    TEXT_LIGHT = colors.HexColor('#9CA3AF')    # Light gray
    BACKGROUND = colors.HexColor('#F9FAFB')    # Off-white
    WHITE = colors.white
    BORDER = colors.HexColor('#E5E7EB')        # Light border
    SUCCESS = colors.HexColor('#10B981')       # Green
    WARNING = colors.HexColor('#F59E0B')       # Amber
    DANGER = colors.HexColor('#EF4444')        # Red


# ============================================
# Custom Styles
# ============================================
def get_custom_styles():
    """Create custom paragraph styles for professional documents"""
    styles = getSampleStyleSheet()
    
    # Title style - Large and bold
    styles.add(ParagraphStyle(
        name='DocTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=PDFColors.PRIMARY_DARK,
        spaceAfter=20,
        spaceBefore=0,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    ))
    
    # Subtitle
    styles.add(ParagraphStyle(
        name='DocSubtitle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=PDFColors.TEXT_GRAY,
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica'
    ))
    
    # Section headers
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=PDFColors.PRIMARY_DARK,
        spaceBefore=20,
        spaceAfter=12,
        fontName='Helvetica-Bold',
        borderPadding=(0, 0, 5, 0),
    ))
    
    # Subsection headers
    styles.add(ParagraphStyle(
        name='SubsectionHeader',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=PDFColors.SECONDARY,
        spaceBefore=15,
        spaceAfter=8,
        fontName='Helvetica-Bold'
    ))
    
    # Body text
    styles.add(ParagraphStyle(
        name='BodyText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=PDFColors.TEXT_DARK,
        spaceAfter=8,
        alignment=TA_JUSTIFY,
        fontName='Helvetica',
        leading=14
    ))
    
    # Small text for fine print
    styles.add(ParagraphStyle(
        name='SmallText',
        parent=styles['Normal'],
        fontSize=8,
        textColor=PDFColors.TEXT_GRAY,
        spaceAfter=4,
        fontName='Helvetica'
    ))
    
    # Price/Amount style
    styles.add(ParagraphStyle(
        name='Amount',
        parent=styles['Normal'],
        fontSize=12,
        textColor=PDFColors.PRIMARY_DARK,
        fontName='Helvetica-Bold',
        alignment=TA_RIGHT
    ))
    
    # Total amount (large)
    styles.add(ParagraphStyle(
        name='TotalAmount',
        parent=styles['Normal'],
        fontSize=18,
        textColor=PDFColors.PRIMARY_DARK,
        fontName='Helvetica-Bold',
        alignment=TA_RIGHT
    ))
    
    return styles


# ============================================
# PDF Service Class
# ============================================
class PDFService:
    """
    Professional PDF generation service for catering operations.
    Generates proposals, production sheets, and contracts.
    """
    
    def __init__(self):
        self.styles = get_custom_styles()
        self.page_width = letter[0]
        self.page_height = letter[1]
        self.margin = 0.75 * inch
    
    def _create_header(self, tenant_data: Dict[str, Any]) -> List:
        """Create document header with logo and company info"""
        elements = []
        
        # Company info table
        tenant_name = tenant_data.get('legal_name') or tenant_data.get('name', 'RestoNext')
        tenant_trade = tenant_data.get('trade_name', '')
        tenant_rfc = tenant_data.get('rfc', '')
        
        address = tenant_data.get('fiscal_address', {})
        address_str = f"{address.get('street', '')} {address.get('ext', '')}"
        if address.get('col'):
            address_str += f", Col. {address.get('col')}"
        if address.get('city'):
            address_str += f", {address.get('city')}"
        if address.get('state'):
            address_str += f", {address.get('state')}"
        if address.get('cp'):
            address_str += f" C.P. {address.get('cp')}"
        
        contacts = tenant_data.get('contacts', {})
        phone = contacts.get('phone', '')
        email = contacts.get('email', '')
        
        # Header with company name and branding
        header_content = [
            [
                Paragraph(f"<b>{tenant_trade or tenant_name}</b>", self.styles['DocTitle']),
            ],
        ]
        
        if tenant_trade and tenant_name != tenant_trade:
            header_content.append([
                Paragraph(tenant_name, self.styles['DocSubtitle']),
            ])
        
        header_table = Table(header_content, colWidths=[self.page_width - 2*self.margin])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(header_table)
        
        # Contact info bar
        contact_data = []
        if tenant_rfc:
            contact_data.append(f"RFC: {tenant_rfc}")
        if phone:
            contact_data.append(f"Tel: {phone}")
        if email:
            contact_data.append(email)
        
        if contact_data:
            contact_text = "  |  ".join(contact_data)
            elements.append(Paragraph(contact_text, self.styles['SmallText']))
            elements.append(Spacer(1, 5))
        
        if address_str.strip():
            elements.append(Paragraph(address_str, self.styles['SmallText']))
        
        # Divider line
        elements.append(Spacer(1, 15))
        elements.append(HRFlowable(
            width="100%",
            thickness=2,
            color=PDFColors.PRIMARY,
            spaceBefore=5,
            spaceAfter=15
        ))
        
        return elements
    
    def _create_client_info_section(self, client_data: Dict[str, Any], event_data: Dict[str, Any]) -> List:
        """Create client and event information section"""
        elements = []
        
        # Section title
        elements.append(Paragraph("INFORMACIÓN DEL EVENTO", self.styles['SectionHeader']))
        
        # Two-column layout for client and event info
        client_name = client_data.get('client_name', 'Cliente')
        client_email = client_data.get('contact_email', '')
        client_phone = client_data.get('contact_phone', '')
        
        event_name = event_data.get('name', 'Evento')
        event_date = event_data.get('start_time')
        if isinstance(event_date, datetime):
            event_date_str = event_date.strftime("%d de %B, %Y")
            event_time_str = event_date.strftime("%H:%M hrs")
        else:
            event_date_str = str(event_date) if event_date else 'Por confirmar'
            event_time_str = ''
        
        guest_count = event_data.get('guest_count', 0)
        location = event_data.get('location', 'Por confirmar')
        
        info_data = [
            [
                Paragraph("<b>Cliente:</b>", self.styles['BodyText']),
                Paragraph(client_name, self.styles['BodyText']),
                Paragraph("<b>Evento:</b>", self.styles['BodyText']),
                Paragraph(event_name, self.styles['BodyText']),
            ],
            [
                Paragraph("<b>Teléfono:</b>", self.styles['BodyText']),
                Paragraph(client_phone, self.styles['BodyText']),
                Paragraph("<b>Fecha:</b>", self.styles['BodyText']),
                Paragraph(event_date_str, self.styles['BodyText']),
            ],
            [
                Paragraph("<b>Email:</b>", self.styles['BodyText']),
                Paragraph(client_email, self.styles['BodyText']),
                Paragraph("<b>Hora:</b>", self.styles['BodyText']),
                Paragraph(event_time_str, self.styles['BodyText']),
            ],
            [
                Paragraph("<b>Invitados:</b>", self.styles['BodyText']),
                Paragraph(f"{guest_count} personas", self.styles['BodyText']),
                Paragraph("<b>Lugar:</b>", self.styles['BodyText']),
                Paragraph(location or 'Por confirmar', self.styles['BodyText']),
            ],
        ]
        
        col_width = (self.page_width - 2*self.margin) / 4
        info_table = Table(info_data, colWidths=[col_width * 0.7, col_width * 1.3, col_width * 0.7, col_width * 1.3])
        info_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BACKGROUND', (0, 0), (-1, -1), PDFColors.BACKGROUND),
            ('GRID', (0, 0), (-1, -1), 0.5, PDFColors.BORDER),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        
        elements.append(info_table)
        elements.append(Spacer(1, 20))
        
        return elements
    
    def _create_menu_section(self, menu_selections: List[Dict[str, Any]], guest_count: int) -> List:
        """Create the menu/items section with pricing"""
        elements = []
        
        elements.append(Paragraph("MENÚ PROPUESTO", self.styles['SectionHeader']))
        
        # Group items by category if available
        # For now, create a simple table
        
        header = ['Platillo', 'Precio Unit.', 'Cantidad', 'Por Persona', 'Subtotal']
        
        menu_data = [header]
        subtotal = 0
        
        for item in menu_selections:
            item_name = item.get('item_name', 'Item')
            unit_price = float(item.get('unit_price', 0))
            quantity = int(item.get('quantity', 1))
            per_person = quantity / guest_count if guest_count > 0 else 0
            line_total = unit_price * quantity
            subtotal += line_total
            
            menu_data.append([
                Paragraph(item_name, self.styles['BodyText']),
                f"${unit_price:,.2f}",
                f"{quantity}",
                f"{per_person:.1f} pza",
                f"${line_total:,.2f}"
            ])
        
        col_widths = [
            (self.page_width - 2*self.margin) * 0.35,
            (self.page_width - 2*self.margin) * 0.15,
            (self.page_width - 2*self.margin) * 0.15,
            (self.page_width - 2*self.margin) * 0.15,
            (self.page_width - 2*self.margin) * 0.20,
        ]
        
        menu_table = Table(menu_data, colWidths=col_widths)
        menu_table.setStyle(TableStyle([
            # Header styling
            ('BACKGROUND', (0, 0), (-1, 0), PDFColors.PRIMARY_DARK),
            ('TEXTCOLOR', (0, 0), (-1, 0), PDFColors.WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            
            # Body styling
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
            ('ALIGN', (-1, 1), (-1, -1), 'RIGHT'),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, PDFColors.BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            
            # Alternate row colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [PDFColors.WHITE, PDFColors.BACKGROUND]),
        ]))
        
        elements.append(menu_table)
        elements.append(Spacer(1, 15))
        
        return elements, subtotal
    
    def _create_totals_section(self, subtotal: float, tax_rate: float = 0.16) -> List:
        """Create the totals section"""
        elements = []
        
        tax = subtotal * tax_rate
        total = subtotal + tax
        
        totals_data = [
            ['', 'Subtotal:', f"${subtotal:,.2f}"],
            ['', f'IVA ({int(tax_rate*100)}%):', f"${tax:,.2f}"],
            ['', 'TOTAL:', f"${total:,.2f}"],
        ]
        
        col_widths = [
            (self.page_width - 2*self.margin) * 0.60,
            (self.page_width - 2*self.margin) * 0.20,
            (self.page_width - 2*self.margin) * 0.20,
        ]
        
        totals_table = Table(totals_data, colWidths=col_widths)
        totals_table.setStyle(TableStyle([
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, 1), 10),
            ('FONTSIZE', (0, 2), (-1, 2), 14),
            ('TEXTCOLOR', (0, 2), (-1, 2), PDFColors.PRIMARY_DARK),
            ('FONTNAME', (0, 2), (-1, 2), 'Helvetica-Bold'),
            ('LINEABOVE', (1, 2), (-1, 2), 1.5, PDFColors.PRIMARY_DARK),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        
        elements.append(totals_table)
        elements.append(Spacer(1, 20))
        
        return elements, total
    
    def _create_terms_section(self, legal_terms: str = None) -> List:
        """Create terms and conditions section"""
        elements = []
        
        elements.append(Paragraph("TÉRMINOS Y CONDICIONES", self.styles['SectionHeader']))
        
        default_terms = """
        <b>1. Confirmación:</b> Este presupuesto tiene una vigencia de 15 días. 
        La reserva se confirma con un depósito del 50% del total.<br/><br/>
        
        <b>2. Pagos:</b> El saldo restante deberá cubrirse 48 horas antes del evento.
        Aceptamos transferencia bancaria, tarjeta de crédito y efectivo.<br/><br/>
        
        <b>3. Cancelaciones:</b> Cancelaciones con menos de 7 días de anticipación 
        no tienen derecho a reembolso del depósito.<br/><br/>
        
        <b>4. Cambios:</b> Modificaciones al menú o número de invitados deben 
        notificarse con al menos 5 días de anticipación.<br/><br/>
        
        <b>5. Personal:</b> El personal de servicio está incluido. Servicio de
        meseros adicionales tiene costo extra.<br/><br/>
        
        <b>6. Montaje:</b> El montaje se realizará 2 horas antes del evento.
        Se requiere acceso al lugar con anticipación.
        """
        
        terms_text = legal_terms or default_terms
        elements.append(Paragraph(terms_text, self.styles['SmallText']))
        elements.append(Spacer(1, 20))
        
        return elements
    
    def _create_signature_section(self, quote_data: Dict[str, Any]) -> List:
        """Create signature section for the proposal"""
        elements = []
        
        elements.append(Paragraph("ACEPTACIÓN DE LA PROPUESTA", self.styles['SectionHeader']))
        
        valid_until = quote_data.get('valid_until')
        if isinstance(valid_until, datetime):
            valid_until_str = valid_until.strftime("%d de %B, %Y")
        else:
            valid_until_str = str(valid_until) if valid_until else 'N/A'
        
        elements.append(Paragraph(
            f"Esta propuesta es válida hasta el <b>{valid_until_str}</b>.",
            self.styles['BodyText']
        ))
        elements.append(Spacer(1, 10))
        
        elements.append(Paragraph(
            "Al firmar este documento, acepto los términos y condiciones establecidos "
            "y confirmo la reserva del servicio de catering para el evento descrito.",
            self.styles['BodyText']
        ))
        elements.append(Spacer(1, 30))
        
        # Signature boxes
        sig_data = [
            ['Cliente', 'Empresa'],
            ['_' * 35, '_' * 35],
            ['Nombre y Firma', 'Representante Autorizado'],
            ['', ''],
            ['Fecha: ________________', 'Fecha: ________________'],
        ]
        
        col_width = (self.page_width - 2*self.margin) / 2
        sig_table = Table(sig_data, colWidths=[col_width, col_width])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(sig_table)
        
        return elements
    
    def _create_footer(self, quote_data: Dict[str, Any]) -> str:
        """Create footer text"""
        quote_id = quote_data.get('id', 'N/A')
        public_token = quote_data.get('public_token', '')
        
        return f"Cotización #{str(quote_id)[:8].upper()} | Token: {public_token[:16]}... | Generado por RestoNext"
    
    def generate_proposal_pdf(
        self,
        tenant_data: Dict[str, Any],
        event_data: Dict[str, Any],
        lead_data: Dict[str, Any],
        menu_selections: List[Dict[str, Any]],
        quote_data: Dict[str, Any],
        legal_terms: Optional[str] = None
    ) -> bytes:
        """
        Generate a professional catering proposal PDF.
        
        Args:
            tenant_data: Restaurant/company information
            event_data: Event details (name, date, location, guests)
            lead_data: Client/contact information
            menu_selections: List of menu items selected for the event
            quote_data: Quote metadata (valid_until, totals, token)
            legal_terms: Optional custom legal terms
        
        Returns:
            PDF as bytes
        """
        buffer = io.BytesIO()
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )
        
        elements = []
        
        # Header with company branding
        elements.extend(self._create_header(tenant_data))
        
        # Proposal title
        elements.append(Paragraph("PROPUESTA DE CATERING", self.styles['DocTitle']))
        elements.append(Paragraph(
            f"Cotización #{str(quote_data.get('id', ''))[:8].upper()}",
            self.styles['DocSubtitle']
        ))
        
        # Client and event info
        elements.extend(self._create_client_info_section(lead_data, event_data))
        
        # Menu items
        menu_elements, subtotal = self._create_menu_section(
            menu_selections, 
            event_data.get('guest_count', 1)
        )
        elements.extend(menu_elements)
        
        # Totals
        totals_elements, total = self._create_totals_section(subtotal)
        elements.extend(totals_elements)
        
        # Terms and conditions
        elements.extend(self._create_terms_section(legal_terms))
        
        # Signature section
        elements.extend(self._create_signature_section(quote_data))
        
        # Build PDF
        doc.build(elements)
        
        buffer.seek(0)
        return buffer.getvalue()
    
    def generate_production_sheet_pdf(
        self,
        tenant_data: Dict[str, Any],
        event_data: Dict[str, Any],
        production_list: List[Dict[str, Any]]
    ) -> bytes:
        """
        Generate a production/prep sheet for kitchen staff.
        
        Args:
            tenant_data: Restaurant information
            event_data: Event details
            production_list: List of ingredients needed with quantities
        
        Returns:
            PDF as bytes
        """
        buffer = io.BytesIO()
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )
        
        elements = []
        
        # Header
        elements.extend(self._create_header(tenant_data))
        
        # Title
        elements.append(Paragraph("HOJA DE PRODUCCIÓN", self.styles['DocTitle']))
        
        # Event info (simplified)
        event_name = event_data.get('name', 'Evento')
        event_date = event_data.get('start_time')
        if isinstance(event_date, datetime):
            event_date_str = event_date.strftime("%d/%m/%Y %H:%M")
        else:
            event_date_str = str(event_date) if event_date else 'Por confirmar'
        guest_count = event_data.get('guest_count', 0)
        
        info_text = f"""
        <b>Evento:</b> {event_name}<br/>
        <b>Fecha:</b> {event_date_str}<br/>
        <b>Personas:</b> {guest_count}<br/>
        """
        elements.append(Paragraph(info_text, self.styles['BodyText']))
        elements.append(Spacer(1, 20))
        
        # Production list table
        elements.append(Paragraph("INGREDIENTES REQUERIDOS", self.styles['SectionHeader']))
        
        header = ['Ingrediente', 'Cantidad Total', 'Unidad', '✓ Preparado']
        table_data = [header]
        
        for item in production_list:
            table_data.append([
                item.get('name', ''),
                f"{float(item.get('quantity', 0)):.2f}",
                item.get('unit', ''),
                '☐'  # Checkbox
            ])
        
        col_widths = [
            (self.page_width - 2*self.margin) * 0.40,
            (self.page_width - 2*self.margin) * 0.20,
            (self.page_width - 2*self.margin) * 0.20,
            (self.page_width - 2*self.margin) * 0.20,
        ]
        
        prod_table = Table(table_data, colWidths=col_widths)
        prod_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PDFColors.SECONDARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), PDFColors.WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 1, PDFColors.BORDER),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [PDFColors.WHITE, PDFColors.BACKGROUND]),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        
        elements.append(prod_table)
        elements.append(Spacer(1, 30))
        
        # Notes section
        elements.append(Paragraph("NOTAS DE PRODUCCIÓN", self.styles['SectionHeader']))
        elements.append(Paragraph(
            "________________________________________________<br/>"
            "________________________________________________<br/>"
            "________________________________________________<br/>"
            "________________________________________________",
            self.styles['BodyText']
        ))
        elements.append(Spacer(1, 20))
        
        # Sign-off
        signoff_data = [
            ['Preparado por:', 'Revisado por:'],
            ['_' * 25, '_' * 25],
            ['Fecha/Hora: ____________', 'Fecha/Hora: ____________'],
        ]
        
        signoff_table = Table(signoff_data, colWidths=[(self.page_width - 2*self.margin) / 2] * 2)
        signoff_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(signoff_table)
        
        # Build PDF
        doc.build(elements)
        
        buffer.seek(0)
        return buffer.getvalue()


# ============================================
# Singleton instance for easy importing
# ============================================
pdf_service = PDFService()
