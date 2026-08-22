from __future__ import annotations

import unittest

from primary_literature_comparison import require_bryson_gstar_anchor, require_source_fields


class PrimaryLiteratureComparisonTests(unittest.TestCase):
    def test_temperature_matched_bryson_anchor_passes(self) -> None:
        require_bryson_gstar_anchor(
            {
                "key": "Bryson2021",
                "definition": "Table 5 Model 1, 5300--6000 K G stars",
                "reported_result": (
                    "0.38 constant-extrapolation low bound and "
                    "0.63 zero-extrapolation high bound"
                ),
            }
        )

    def test_broader_bryson_anchor_is_rejected(self) -> None:
        with self.assertRaises(RuntimeError):
            require_bryson_gstar_anchor(
                {
                    "key": "Bryson2021",
                    "definition": "4800--6300 K eta_Earth",
                    "reported_result": "0.37 and 0.60",
                }
            )

    def test_complete_primary_source_record_passes(self) -> None:
        require_source_fields(
            {
                "key": "Example2026",
                "authors": "Example et al.",
                "year": 2026,
                "journal": "Example Journal",
                "doi": "10.0000/example",
                "primary_url": "https://example.org/paper",
                "quantity": "eta",
                "definition": "specified domain",
                "reported_result": "specified result",
                "comparison_role": "different_estimand",
                "comparability": "not directly comparable",
            }
        )

    def test_incomplete_or_untraceable_source_is_rejected(self) -> None:
        incomplete = {
            "key": "Example2026",
            "authors": "Example et al.",
            "year": 2026,
            "journal": "Example Journal",
            "doi": "invalid",
            "primary_url": "http://example.org/paper",
            "quantity": "eta",
            "definition": "specified domain",
            "reported_result": "specified result",
            "comparison_role": "different_estimand",
        }
        with self.assertRaises(RuntimeError):
            require_source_fields(incomplete)


if __name__ == "__main__":
    unittest.main()
