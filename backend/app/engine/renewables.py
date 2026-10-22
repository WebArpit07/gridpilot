"""
Renewable Energy Intelligence Track: Phase 8 Dynamic Solar PV Generation,
Time-of-Use (ToU) Cost Optimization, and Carbon Offset Analytics.
"""
import math
from typing import Optional
from pydantic import BaseModel, Field


class TariffProfile(BaseModel):
    """
    Dynamic Time-of-Use (ToU) electricity tariff contract.
    Standard Schedule:
      - Off-Peak Rate: $0.10 / kWh (e.g., night / early morning: < 40 min or >= 180 min)
      - Standard Rate: $0.18 / kWh (e.g., daytime / midday: 40 <= t < 120 min)
      - Peak Rate: $0.32 / kWh (e.g., late afternoon / early evening: 120 <= t < 180 min)
    """
    off_peak_rate: float = Field(default=0.10, ge=0.0, description="Off-peak electricity tariff in $/kWh")
    standard_rate: float = Field(default=0.18, ge=0.0, description="Standard electricity tariff in $/kWh")
    peak_rate: float = Field(default=0.32, ge=0.0, description="Peak electricity tariff in $/kWh")

    off_peak_morning_end: int = Field(default=40, ge=0, description="Minute when morning off-peak window ends")
    standard_end: int = Field(default=120, ge=0, description="Minute when standard tariff window ends")
    peak_end: int = Field(default=180, ge=0, description="Minute when peak tariff window ends")

    def get_tariff_at_minute(self, time_minute: int) -> float:
        """
        Returns dynamic electricity tariff rate ($/kWh) for the specified simulation minute.
        """
        if time_minute < 0:
            return self.off_peak_rate
        if self.peak_end > 0 and time_minute >= self.peak_end:
            # Transition to night off-peak tariff
            return self.off_peak_rate
        if time_minute < self.off_peak_morning_end:
            return self.off_peak_rate
        elif time_minute < self.standard_end:
            return self.standard_rate
        elif time_minute < self.peak_end:
            return self.peak_rate
        return self.off_peak_rate


class SolarGenerationProfile(BaseModel):
    """
    Solar PV generation curve using a realistic bell-curve / solar irradiation model
    peaking around midday (simulation minute 60-120), smoothly dropping to 0 kW at night.
    """
    installed_capacity_kw: float = Field(default=30.0, ge=0.0, description="Base installed solar PV capacity in kW")
    sunrise_minute: int = Field(default=0, ge=0, description="Minute of sunrise when generation commences")
    sunset_minute: int = Field(default=180, gt=0, description="Minute of sunset when generation ceases")
    midday_minute: int = Field(default=90, ge=0, description="Midday solar insolation peak minute")

    def __init__(
        self,
        installed_capacity_kw: Optional[float] = None,
        peak_power_kw: Optional[float] = None,
        base_capacity_kw: Optional[float] = None,
        **data,
    ):
        cap = installed_capacity_kw
        if cap is None and peak_power_kw is not None:
            cap = peak_power_kw
        elif cap is None and base_capacity_kw is not None:
            cap = base_capacity_kw
        elif cap is None:
            cap = data.get("installed_capacity_kw", 30.0)
        data["installed_capacity_kw"] = float(cap)
        super().__init__(**data)

    @property
    def peak_power_kw(self) -> float:
        """Alias for installed_capacity_kw."""
        return self.installed_capacity_kw

    def get_solar_power_kw(self, time_minute: int) -> float:
        """
        Returns instantaneous available solar PV power in kW for the given simulation minute.
        Implements a sinusoidal solar irradiation bell-curve model peaking at midday (minute 90,
        within the 60-120 range) and returning 0.0 kW during off-hours and nighttime.
        """
        if time_minute <= self.sunrise_minute or time_minute >= self.sunset_minute:
            return 0.0

        day_length = self.sunset_minute - self.sunrise_minute
        if day_length <= 0:
            return 0.0

        normalized_t = (time_minute - self.sunrise_minute) / day_length
        # Sinusoidal half-wave solar insolation model (Hottel model)
        insolation_fraction = math.sin(math.pi * normalized_t)
        if insolation_fraction <= 0.0:
            return 0.0

        return round(self.installed_capacity_kw * insolation_fraction, 4)


class CarbonMetrics(BaseModel):
    """
    Carbon intensity metrics and avoided emission calculations.
    - Grid Carbon Intensity: 0.70 kg CO2 / kWh
    - Solar Carbon Intensity: 0.00 kg CO2 / kWh
    """
    grid_carbon_intensity_kg_per_kwh: float = Field(
        default=0.70, ge=0.0, description="Average grid carbon emission factor (kg CO2 / kWh)"
    )
    solar_carbon_intensity_kg_per_kwh: float = Field(
        default=0.00, ge=0.0, description="Solar PV life-cycle operational emissions (kg CO2 / kWh)"
    )

    GRID_CARBON_INTENSITY: float = 0.70
    SOLAR_CARBON_INTENSITY: float = 0.00

    def calculate_co2_kg(self, grid_kwh: float = 0.0, solar_kwh: float = 0.0) -> float:
        """Calculates gross CO2 emissions in kg for grid and solar electricity consumed."""
        return round(
            max(0.0, grid_kwh) * self.grid_carbon_intensity_kg_per_kwh
            + max(0.0, solar_kwh) * self.solar_carbon_intensity_kg_per_kwh,
            4,
        )

    def calculate_avoided_co2_kg(self, solar_kwh: float) -> float:
        """Calculates avoided CO2 emissions in kg resulting from green solar power generation."""
        return round(
            max(0.0, solar_kwh)
            * (self.grid_carbon_intensity_kg_per_kwh - self.solar_carbon_intensity_kg_per_kwh),
            4,
        )


def calculate_renewable_split(
    allocated_power_kw: float,
    available_solar_kw: float,
    tariff_rate: float,
    delta_t_min: int = 1,
    carbon_intensity_kg_per_kwh: float = 0.70,
) -> dict[str, float]:
    """
    Computes interval power and energy split between on-site solar PV and the utility grid:
      - If allocated_power_kw <= available_solar_kw:
          100% of charging energy is green, zero grid cost incurred.
      - If allocated_power_kw > available_solar_kw:
          Solar supplies available_solar_kw, and the difference is drawn from the grid at tariff_rate.
    """
    allocated = max(0.0, float(allocated_power_kw))
    solar_avail = max(0.0, float(available_solar_kw))
    rate = max(0.0, float(tariff_rate))
    hours = delta_t_min / 60.0

    if allocated <= solar_avail:
        solar_power = allocated
        grid_power = 0.0
    else:
        solar_power = solar_avail
        grid_power = allocated - solar_avail

    solar_energy_kwh = solar_power * hours
    grid_energy_kwh = grid_power * hours
    total_energy_kwh = solar_energy_kwh + grid_energy_kwh

    grid_cost_usd = grid_energy_kwh * rate
    cost_saved_usd = solar_energy_kwh * rate
    co2_avoided_kg = solar_energy_kwh * carbon_intensity_kg_per_kwh

    return {
        "allocated_power_kw": allocated,
        "available_solar_kw": solar_avail,
        "solar_power_kw": round(solar_power, 4),
        "grid_power_kw": round(grid_power, 4),
        "solar_energy_kwh": round(solar_energy_kwh, 6),
        "grid_energy_kwh": round(grid_energy_kwh, 6),
        "total_energy_kwh": round(total_energy_kwh, 6),
        "tariff_rate": round(rate, 4),
        "grid_cost_usd": round(grid_cost_usd, 6),
        "cost_saved_usd": round(cost_saved_usd, 6),
        "co2_avoided_kg": round(co2_avoided_kg, 6),
    }
