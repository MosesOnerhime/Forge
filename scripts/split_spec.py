"""Keep the six source specification documents in sync with the pasted brief."""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "SOURCE_SPEC.md"
DESTINATIONS = {
    1: "PRD.md",
    2: "TRD.md",
    3: "APP_FLOW.md",
    4: "DESIGN_BRIEF.md",
    5: "BACKEND_SCHEMA.md",
    6: "IMPLEMENTATION_PLAN.md",
}


def main() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    markers = list(re.finditer(r"(?m)^#{1,2} ([1-6])\. ", source))
    found = [int(match.group(1)) for match in markers]
    if found != list(DESTINATIONS):
        raise ValueError(f"Expected specification sections 1–6, found {found}")

    for index, marker in enumerate(markers):
        number = int(marker.group(1))
        end = markers[index + 1].start() if index + 1 < len(markers) else len(source)
        section = source[marker.start() : end].strip() + "\n"
        (SOURCE.parent / DESTINATIONS[number]).write_text(section, encoding="utf-8")


if __name__ == "__main__":
    main()
