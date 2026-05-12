"""
Loads all markdown files from knowledge_base/ and splits them into chunks.

Chunking strategy:
  - Split on H2/H3 headings — each heading starts a new chunk.
  - If a section exceeds MAX_CHARS, further split on blank lines (paragraphs).
  - Each chunk carries the document title and section heading for context.
"""

import re
from pathlib import Path
from dataclasses import dataclass


MAX_CHARS = 1200  # ~300-400 tokens; safe for multilingual-mpnet (512 token limit)


@dataclass
class Chunk:
    text: str        # full text sent to the embedder and LLM
    source: str      # filename stem, e.g. "main_regulations"
    heading: str     # nearest heading, for citation


def _split_on_paragraphs(text: str, max_chars: int) -> list[str]:
    """Split long text on blank lines; merge short pieces back up to max_chars."""
    paragraphs = re.split(r"\n{2,}", text.strip())
    parts: list[str] = []
    current = ""
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if current and len(current) + len(para) + 2 > max_chars:
            parts.append(current)
            current = para
        else:
            current = (current + "\n\n" + para).strip() if current else para
    if current:
        parts.append(current)
    return parts


def load_chunks(knowledge_base_dir: Path) -> list[Chunk]:
    chunks: list[Chunk] = []

    for md_file in sorted(knowledge_base_dir.glob("*.md")):
        source = md_file.stem
        text = md_file.read_text(encoding="utf-8")

        # Extract document-level title (first # heading)
        title_match = re.search(r"^#\s+(.+)", text, re.MULTILINE)
        doc_title = title_match.group(1).strip() if title_match else source

        # Split into sections by H2/H3 headings
        section_pattern = re.compile(r"^(#{2,3})\s+(.+)", re.MULTILINE)
        matches = list(section_pattern.finditer(text))

        if not matches:
            # No subheadings — treat whole file as one chunk (or split by paragraphs)
            for part in _split_on_paragraphs(text, MAX_CHARS):
                chunks.append(Chunk(
                    text=f"[{doc_title}]\n\n{part}",
                    source=source,
                    heading=doc_title,
                ))
            continue

        # Collect sections: (heading_text, section_body)
        sections: list[tuple[str, str]] = []
        for i, match in enumerate(matches):
            heading_text = match.group(2).strip()
            start = match.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            body = text[start:end].strip()
            sections.append((heading_text, body))

        # Also capture any preamble before the first heading
        preamble = text[: matches[0].start()].strip()
        if preamble:
            for part in _split_on_paragraphs(preamble, MAX_CHARS):
                chunks.append(Chunk(
                    text=f"[{doc_title}]\n\n{part}",
                    source=source,
                    heading=doc_title,
                ))

        for heading_text, body in sections:
            full_section = f"[{doc_title} — {heading_text}]\n\n{body}"
            if len(full_section) <= MAX_CHARS:
                chunks.append(Chunk(text=full_section, source=source, heading=heading_text))
            else:
                for part in _split_on_paragraphs(body, MAX_CHARS):
                    chunks.append(Chunk(
                        text=f"[{doc_title} — {heading_text}]\n\n{part}",
                        source=source,
                        heading=heading_text,
                    ))

    return chunks
