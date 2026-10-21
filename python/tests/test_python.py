"""Run with:  python3 -m unittest discover -s python/tests

These tests protect the Python parts of the site. In GitHub Actions they run
before every build, so a broken script stops a bad deploy.
"""
import json
import sys
import unittest
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))
sys.path.insert(0, str(ROOT / "public" / "py"))

import build_insights_index as insights  # noqa: E402
import cohesion_score as cohesion  # noqa: E402
import generate_slots as slots  # noqa: E402


class SlotTests(unittest.TestCase):
    def test_only_workdays_and_future_dates(self):
        today = date(2026, 10, 20)
        days = slots.build_slots(today)
        self.assertTrue(days)
        for key in days:
            d = date.fromisoformat(key)
            self.assertGreater(d, today)
            self.assertIn(d.weekday(), slots.WORKDAYS)

    def test_output_is_repeatable(self):
        today = date(2026, 10, 20)
        self.assertEqual(slots.build_slots(today), slots.build_slots(today))

    def test_slots_carry_utc_offset(self):
        first = next(iter(slots.build_slots(date(2026, 10, 20)).values()))[0]
        self.assertRegex(first, r"[+-]\d\d:\d\d$")


class InsightsTests(unittest.TestCase):
    def test_frontmatter_parsing(self):
        meta, body = insights.parse_frontmatter("---\ntitle: Hi\ntags: [a, b]\n---\nBody text")
        self.assertEqual(meta["title"], "Hi")
        self.assertEqual(meta["tags"], ["a", "b"])
        self.assertEqual(body, "Body text")

    def test_reading_time_has_a_floor_of_one(self):
        self.assertEqual(insights.reading_minutes("short"), 1)


class CohesionTests(unittest.TestCase):
    def answers(self, value):
        return json.dumps({f"q{i}": value for i in range(1, 9)})

    def test_all_fives_on_positive_questions_is_high(self):
        data = {f"q{i}": 5 for i in range(1, 9)}
        data["q2"] = 1
        data["q5"] = 1
        result = json.loads(cohesion.score_json(json.dumps(data)))
        self.assertEqual(result["overall"], 100)
        self.assertEqual(result["level"], "Strong")

    def test_lowest_dimension_becomes_focus(self):
        data = {f"q{i}": 5 for i in range(1, 9)}
        data.update({"q2": 1, "q5": 1, "q7": 1, "q8": 1})
        result = json.loads(cohesion.score_json(json.dumps(data)))
        self.assertEqual(result["focus"], "trust")

    def test_out_of_range_answers_are_clamped(self):
        result = json.loads(cohesion.score_json(self.answers(99)))
        self.assertLessEqual(result["overall"], 100)


if __name__ == "__main__":
    unittest.main()
