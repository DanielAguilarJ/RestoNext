from typing import Union
from app.models.models import UnitOfMeasure

class UnitConversionError(ValueError):
    """Raised when unit conversion is not possible"""
    pass

def convert_unit(quantity: float, from_unit: Union[str, UnitOfMeasure], to_unit: Union[str, UnitOfMeasure]) -> float:
    """
    Convert a quantity from one unit to another.
    
    Supported conversions:
    - Weight: KG <-> G
    - Volume: LT <-> ML
    - Identity: PZA <-> PZA, PORCION <-> PORCION
    
    Args:
        quantity: The amount to convert
        from_unit: The source unit
        to_unit: The target unit
        
    Returns:
        The converted quantity
        
    Raises:
        UnitConversionError: If units are incompatible
    """
    # Normalize units to string
    src = from_unit.value if isinstance(from_unit, UnitOfMeasure) else from_unit
    dst = to_unit.value if isinstance(to_unit, UnitOfMeasure) else to_unit
    
    # If units are the same, no conversion needed
    if src == dst:
        return quantity
        
    # Weight conversions
    if src == UnitOfMeasure.KG.value and dst == UnitOfMeasure.G.value:
        return quantity * 1000.0
    if src == UnitOfMeasure.G.value and dst == UnitOfMeasure.KG.value:
        return quantity / 1000.0
        
    # Volume conversions
    if src == UnitOfMeasure.LT.value and dst == UnitOfMeasure.ML.value:
        return quantity * 1000.0
    if src == UnitOfMeasure.ML.value and dst == UnitOfMeasure.LT.value:
        return quantity / 1000.0
        
    # Check for incompatible types
    # Group units by type
    weight_units = {UnitOfMeasure.KG.value, UnitOfMeasure.G.value}
    volume_units = {UnitOfMeasure.LT.value, UnitOfMeasure.ML.value}
    other_units = {UnitOfMeasure.PZA.value, UnitOfMeasure.PORCION.value}
    
    src_type = None
    if src in weight_units: src_type = 'weight'
    elif src in volume_units: src_type = 'volume'
    elif src in other_units: src_type = 'other'
    
    dst_type = None
    if dst in weight_units: dst_type = 'weight'
    elif dst in volume_units: dst_type = 'volume'
    elif dst in other_units: dst_type = 'other'
    
    if src_type != dst_type:
        raise UnitConversionError(f"Cannot convert between {src} ({src_type}) and {dst} ({dst_type})")
        
    # If we get here, valid type but implementation missing? 
    # Or maybe it's PZA <-> PZA which is handled by src == dst check.
    # What about PZA <-> PORCION? Usually not convertible without more context.
    
    raise UnitConversionError(f"Conversion from {src} to {dst} is not supported")
