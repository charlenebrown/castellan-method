"""Team Cohesion Check scoring, run in the visitor's browser by Pyodide.

The React component sends in a JSON string of answers, for example:
    {"q1": 4, "q2": 2, ...}
Each answer is 1 (rarely true) to 5 (almost always true).
We return a JSON string, which JavaScript can parse back into an object.

Teaching notes
--------------
* Pyodide is Python compiled to WebAssembly. Nothing here talks to a server.
* Data crosses the JavaScript/Python border most simply as a JSON string.
* Questions 2 and 5 are phrased negatively, so they are "reverse scored":
  a 5 on "meetings leave people drained" is a bad sign, so it counts as 1.
"""
import json

# Which questions belong to which part of the Castellan Method.
DIMENSIONS = {
    "quiet": ["q1", "q2", "q3"],      # attention and noise
    "present": ["q4", "q5", "q6"],    # real connection
    "trust": ["q7", "q8"],            # shared confidence
}
REVERSED = {"q2", "q5"}

LABELS = {"quiet": "Quiet", "present": "Present", "trust": "Trust"}

NEXT_STEPS = {
    "quiet": "Start with the Quiet work: cut notification noise and protect shared focus time.",
    "present": "Start with the Present work: rebuild real connection in meetings, in the room and on screen.",
    "trust": "Start with the Trust work: make confidence a shared habit through clear, repeatable team rituals.",
}


def _value(answers, key):
    raw = int(answers.get(key, 3))
    raw = min(5, max(1, raw))
    return 6 - raw if key in REVERSED else raw


def _level(percent):
    if percent >= 75:
        return "Strong"
    if percent >= 50:
        return "Developing"
    return "At risk"


def score_json(answers_json):
    answers = json.loads(answers_json)
    parts = {}
    for name, keys in DIMENSIONS.items():
        values = [_value(answers, k) for k in keys]
        percent = round((sum(values) - len(values)) / (4 * len(values)) * 100)
        parts[name] = {"label": LABELS[name], "percent": percent, "level": _level(percent)}

    overall = round(sum(p["percent"] for p in parts.values()) / len(parts))
    weakest = min(parts, key=lambda n: parts[n]["percent"])

    result = {
        "overall": overall,
        "level": _level(overall),
        "parts": parts,
        "focus": weakest,
        "nextStep": NEXT_STEPS[weakest],
        "engine": "python",
    }
    return json.dumps(result)
