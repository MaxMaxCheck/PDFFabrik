import re


_ARTIFACT_TOKEN = (
    r"(?:"
    r"\d+\s+(?:Foto[s]?|Bild(?:er)?)"
    r"|(?:Seite|Page)\s+\d+\s+(?:von|of)\s+\d+"
    r"|Seite\s+\d+"
    r")"
)

# Zeilen, die nur aus PDF-/Viewer-Artefakten bestehen und im Fließtext nichts beitragen.
_ARTIFACT_LINE_RE = re.compile(
    rf"^(?:{_ARTIFACT_TOKEN}\s*)+$",
    re.IGNORECASE,
)


def clean_extracted_text_artifacts(text: str) -> str:
    """Entfernt bekannte PDF-Artefakt-Zeilen und kollabiert Leerzeilen."""
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    kept = [ln for ln in lines if not _ARTIFACT_LINE_RE.match(ln.strip())]

    result: list[str] = []
    prev_blank = False
    for ln in kept:
        blank = not ln.strip()
        if blank and prev_blank:
            continue
        result.append(ln)
        prev_blank = blank
    return "\n".join(result).strip()
