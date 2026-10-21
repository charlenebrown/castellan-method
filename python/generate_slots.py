"""Generate demo booking availability for the next six weeks.

Runs in GitHub Actions on every push (and weekly on a schedule) so the calendar
always looks current. The output is plain JSON that the React calendar imports.

Teaching notes
--------------
* ``zoneinfo`` gives us real time zones, so daylight saving is handled for us.
* Every slot is stored as an ISO string WITH its UTC offset
  (e.g. 2026-11-02T09:00:00-05:00). The browser can then convert to the
  visitor's own time zone without any guessing.
* We "hide" some slots using a hash instead of random numbers. A hash of the
  same input is always the same, so the output is repeatable and testable.
"""
from __future__ import annotations

import hashlib
import json
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/New_York")
WEEKS_AHEAD = 6
WORKDAYS = {0, 1, 2, 3}  # Monday to Thursday
START_TIMES = [time(9, 0), time(10, 30), time(13, 0), time(14, 30), time(16, 0)]
OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "slots.json"


def is_taken(day: date, start: time) -> bool:
    """Deterministically mark about one in four slots as already booked."""
    digest = hashlib.sha256(f"{day.isoformat()}-{start.strftime('%H%M')}".encode()).digest()
    return digest[0] % 4 == 0


def build_slots(today: date) -> dict[str, list[str]]:
    days: dict[str, list[str]] = {}
    for offset in range(1, WEEKS_AHEAD * 7 + 1):
        day = today + timedelta(days=offset)
        if day.weekday() not in WORKDAYS:
            continue
        slots = [
            datetime.combine(day, start, tzinfo=TZ).isoformat()
            for start in START_TIMES
            if not is_taken(day, start)
        ]
        if slots:
            days[day.isoformat()] = slots
    return days


def main() -> None:
    today = datetime.now(TZ).date()
    payload = {
        "generated": today.isoformat(),
        "timezone": "America/New_York",
        "durationMinutes": 30,
        "days": build_slots(today),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {sum(len(v) for v in payload['days'].values())} slots to {OUT}")


if __name__ == "__main__":
    main()
