"""Build an index of the Insights articles.

For every Markdown file in src/content/insights this script works out:
  * reading time
  * three related articles (shared tags and theme score highest)
  * a small search index (title, summary, tags)

and writes everything to src/data/insights-index.json.

Teaching notes
--------------
* Frontmatter is the block between the two ``---`` lines at the top of a file.
  We parse it by hand so the script needs no extra packages.
* "Related" is a tiny scoring function: +2 for the same theme, +1 per shared tag.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "content" / "insights"
OUT = ROOT / "src" / "data" / "insights-index.json"
WORDS_PER_MINUTE = 220


def parse_frontmatter(text: str) -> tuple[dict[str, object], str]:
    match = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not match:
        return {}, text
    meta: dict[str, object] = {}
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key, value = key.strip(), value.strip()
        if value.startswith("[") and value.endswith("]"):
            meta[key] = [item.strip().strip("'\"") for item in value[1:-1].split(",") if item.strip()]
        else:
            meta[key] = value.strip("'\"")
    return meta, match.group(2)


def reading_minutes(body: str) -> int:
    words = len(re.findall(r"\w+", body))
    return max(1, round(words / WORDS_PER_MINUTE))


def related_score(a: dict, b: dict) -> int:
    score = 2 if a["theme"] == b["theme"] else 0
    score += len(set(a["tags"]) & set(b["tags"]))
    return score


def main() -> None:
    articles: dict[str, dict] = {}
    for path in sorted(SRC.glob("*.md")):
        meta, body = parse_frontmatter(path.read_text(encoding="utf-8"))
        articles[path.stem] = {
            "slug": path.stem,
            "title": meta.get("title", path.stem),
            "summary": meta.get("summary", ""),
            "theme": meta.get("theme", ""),
            "tags": meta.get("tags", []),
            "readingMinutes": reading_minutes(body),
        }

    for slug, article in articles.items():
        others = [a for s, a in articles.items() if s != slug]
        others.sort(key=lambda o: (-related_score(article, o), o["slug"]))
        article["related"] = [o["slug"] for o in others[:3]]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(articles, indent=2) + "\n", encoding="utf-8")
    print(f"Indexed {len(articles)} articles to {OUT}")


if __name__ == "__main__":
    main()
