
import pytest
from app.utils.units import convert_unit, UnitConversionError
from app.models.models import UnitOfMeasure

@pytest.mark.parametrize("quantity, from_unit, to_unit, expected", [
    (1.0, UnitOfMeasure.KG, UnitOfMeasure.G, 1000.0),
    (500.0, UnitOfMeasure.G, UnitOfMeasure.KG, 0.5),
    (1.5, UnitOfMeasure.KG, UnitOfMeasure.KG, 1.5),
    (2.0, UnitOfMeasure.LT, UnitOfMeasure.ML, 2000.0),
    (250.0, UnitOfMeasure.ML, UnitOfMeasure.LT, 0.25),
    (5.0, UnitOfMeasure.PZA, UnitOfMeasure.PZA, 5.0),
    (10.0, UnitOfMeasure.PORCION, UnitOfMeasure.PORCION, 10.0),
    (1.0, "kg", "g", 1000.0),  # String input test
    (1000.0, "ml", "lt", 1.0), # String input test
])
def test_convert_unit_success(quantity, from_unit, to_unit, expected):
    """Test successful unit conversions"""
    assert convert_unit(quantity, from_unit, to_unit) == expected

@pytest.mark.parametrize("from_unit, to_unit", [
    (UnitOfMeasure.KG, UnitOfMeasure.LT),    # Weight to Volume
    (UnitOfMeasure.ML, UnitOfMeasure.G),     # Volume to Weight
    (UnitOfMeasure.PZA, UnitOfMeasure.KG),   # Identity to Weight
    (UnitOfMeasure.PORCION, UnitOfMeasure.LT), # Identity to Volume
])
def test_convert_unit_incompatible(from_unit, to_unit):
    """Test that incompatible unit conversions raise UnitConversionError"""
    with pytest.raises(UnitConversionError):
        convert_unit(1.0, from_unit, to_unit)

def test_convert_unit_unsupported():
    """Test unsupported units (though handled by enum generally, checking string case)"""
    with pytest.raises(UnitConversionError):
        convert_unit(1.0, "unknown_unit", "kg")
