from __future__ import annotations

import unittest

import numpy as np

from dr25_support_audit import (
    earth_analog_target_mask,
    rectangular_target_mask,
    seff,
    MAXIMUM_GREENHOUSE,
    RUNAWAY_1MEARTH,
)


class Dr25SupportMaskTests(unittest.TestCase):
    def test_target_boundaries_are_inclusive(self) -> None:
        teff = np.array([5300.0, 6000.0])
        radius = np.array([0.9, 1.1])
        inner = seff(teff, RUNAWAY_1MEARTH)
        instellation = np.minimum(1.1, inner)
        mask = earth_analog_target_mask(radius, instellation, teff)
        self.assertTrue(mask.all())

    def test_conservative_hz_mask_is_subset_of_rectangle(self) -> None:
        teff = np.linspace(5300.0, 6000.0, 100)
        radius = np.linspace(0.8, 1.2, 100)
        instellation = np.linspace(0.8, 1.2, 100)
        earth_analog = earth_analog_target_mask(radius, instellation, teff)
        rectangle = rectangular_target_mask(radius, instellation, teff)
        self.assertFalse(np.any(earth_analog & ~rectangle))

    def test_flux_outside_climate_intersection_is_rejected(self) -> None:
        teff = np.array([5300.0])
        inner = seff(teff, RUNAWAY_1MEARTH)
        self.assertLess(float(inner[0]), 1.1)
        mask = earth_analog_target_mask(
            np.array([1.0]), np.array([1.1]), teff
        )
        self.assertFalse(bool(mask[0]))
        outer = seff(teff, MAXIMUM_GREENHOUSE)
        self.assertLess(float(outer[0]), 0.9)


if __name__ == "__main__":
    unittest.main()
