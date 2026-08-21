from __future__ import annotations

import unittest

from sensitivity_freeze import fractional_change, require_close


class SensitivityFreezeTests(unittest.TestCase):
    def test_fractional_change_uses_reference_denominator(self) -> None:
        self.assertAlmostEqual(fractional_change(110.0, 100.0), 0.1)
        self.assertAlmostEqual(fractional_change(90.0, 100.0), -0.1)

    def test_zero_reference_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            fractional_change(1.0, 0.0)

    def test_anchor_tolerance(self) -> None:
        require_close("anchor", 1.0001, 1.0, 0.001)
        with self.assertRaises(RuntimeError):
            require_close("anchor", 1.01, 1.0, 0.001)


if __name__ == "__main__":
    unittest.main()
