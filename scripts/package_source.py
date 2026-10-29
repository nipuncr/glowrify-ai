"""Package the complete portable project, excluding secrets and generated/dependency trees."""

from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
FOLDERS = (
    "app",
    "components",
    "lib",
    "public",
    "backend",
    "supabase",
    "scripts",
    "deploy",
    ".github",
)
ROOT_FILES = (
    "README.md",
    "VERIFICATION.md",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.ts",
    "next-env.d.ts",
    "postcss.config.mjs",
    "compose.yaml",
    ".env.example",
    ".gitignore",
    ".dockerignore",
)
EXCLUDED = {
    "__pycache__",
    ".pytest_cache",
    ".venv",
    "node_modules",
    "models",
    ".setup-venv",
}
GENERATED = {"glowrify-source.zip", "glowrify-full-code.md"}
files = []
for name in FOLDERS:
    for path in (ROOT / name).rglob("*"):
        relative = path.relative_to(ROOT)
        if (
            path.is_file()
            and not path.is_symlink()
            and not EXCLUDED.intersection(relative.parts)
            and path.name not in GENERATED
            and not path.name == ".env"
            and not (path.name.startswith(".env.") and path.name != ".env.example")
        ):
            files.append(path)
files.extend(ROOT / name for name in ROOT_FILES)
files = sorted(set(files))
for path in files:
    if not path.is_file():
        raise SystemExit(f"Missing source file: {path.relative_to(ROOT)}")
with ZipFile(ROOT / "public/glowrify-source.zip", "w", ZIP_DEFLATED) as archive:
    for path in files:
        archive.write(path, "glowrify/" + str(path.relative_to(ROOT)))
parts = [
    "# Glowrify — complete source files\n\nSee README.md below for setup, architecture and verification limits.\n"
]
for path in files:
    relative = str(path.relative_to(ROOT))
    language = {
        ".py": "python",
        ".tsx": "tsx",
        ".ts": "typescript",
        ".sql": "sql",
        ".json": "json",
        ".mjs": "javascript",
        ".css": "css",
        ".yaml": "yaml",
        ".yml": "yaml",
        ".svg": "xml",
        ".md": "markdown",
    }.get(path.suffix, "text")
    parts.append(f"\n## {relative}\n\n````{language}\n{path.read_text()}\n````\n")
(ROOT / "public/glowrify-full-code.md").write_text("".join(parts))
print(f"Packaged {len(files)} source files into ZIP and full-code Markdown.")
