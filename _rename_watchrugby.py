#!/usr/bin/env python3
"""
Aggressively rename rugbywatch-app → WatchRugby across ALL files.
Then commit and push to GitHub.
"""
import os, sys, re, subprocess, glob

ROOT = "/Users/joker/rugbywatch-app"
EXCLUDE_DIRS = {".git", "node_modules", "assets", "docs", "android/app/build", "ios/App/App/build"}
EXCLUDE_EXT = {".png", ".jpg", ".jpeg", ".svg", ".ico", ".mp3", ".mp4", ".aab", ".apk", ".ipa", ".pbxproj", ".pdf", ".zip", ".lock"}

# Rename map: (regex, replacement) — order matters (longer/more specific first)
REPLACEMENTS = [
    # Display names (title case)
    (re.compile(r"WatchRugby", re.IGNORECASE), "WatchRugby"),
    (re.compile(r"WatchRugby", re.IGNORECASE), "WatchRugby"),
    # Lowercase app name in IDs/URLs/paths
    (re.compile(r"\bWatchRugby\b", re.IGNORECASE), "watchrugby"),
    # watchrugby as standalone app-name token → watchrugby
    # but NOT inside "rugbywatch-app" directory references or repo URLs
    (re.compile(r"\brugbywatch\b(?![.-]app)(?!\s*[-/])", re.IGNORECASE), "watchrugby"),
]

SKIP_FILES = {
    "package-lock.json",
    "capacitor.config.ts",
}

def should_skip_path(rel):
    parts = Path(rel).parts
    for d in EXCLUDE_DIRS:
        if d in parts:
            return True
    return False

def process_file(filepath):
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except Exception as e:
        print(f"  SKIP (read error) {filepath}: {e}")
        return False
    
    original = content
    for pattern, replacement in REPLACEMENTS:
        content = pattern.sub(replacement, content)
    
    if content == original:
        return False
    
    # Special handling: don't break repo URL
    # "https://github.com/robin-virtcirt/rugbywatch-app" — keep the repo name
    # Fix any over-eager replacements in URLs
    content = re.sub(
        r"https://github\.com/robin-virtcirt/rugbywatch-app",
        "https://github.com/robin-virtcirt/rugbywatch-app",
        content
    )
    # Fix "rugbywatch-app" directory references → keep as-is (it's the repo)
    # but "rugbywatch-app" as a name token → watchrugby
    # Actually keep "rugbywatch-app" as directory name, it's fine
    content = content.replace("rugbywatch-app", "rugbywatch-app")  # undo if over-matched
    
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
    except Exception as e:
        print(f"  SKIP (write error) {filepath}: {e}")
        return False
    return True

from pathlib import Path

changed = []
errors = []
for root, dirs, files in os.walk(ROOT):
    # Prune excluded dirs
    rel_root = os.path.relpath(root, ROOT)
    if rel_root == ".":
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
    else:
        parts = rel_root.split(os.sep)
        if any(d in EXCLUDE_DIRS for d in parts):
            dirs[:] = []
            continue
    
    for fname in files:
        if fname in SKIP_FILES:
            continue
        ext = os.path.splitext(fname)[1].lower()
        if ext in EXCLUDE_EXT:
            continue
        
        fpath = os.path.join(root, fname)
        rel = os.path.relpath(fpath, ROOT)
        
        if should_skip_path(rel):
            continue
        
        if fname.endswith((".js", ".html", ".css", ".json", ".md", ".txt", ".py", ".xml", ".plist", ".ts", ".gradle", ".java", ".podfile", ".lock")):
            if process_file(fpath):
                changed.append(rel)
                print(f"  ✓ {rel}")
            # else: unchanged, skip silently

print(f"\n=== {len(changed)} files changed ===")
for c in changed:
    print(f"  {c}")

# Also handle CNAME
cname = os.path.join(ROOT, "CNAME")
if os.path.exists(cname):
    with open(cname) as f:
        old = f.read().strip()
    if old and old != "watchrugby.top":
        with open(cname, "w") as f:
            f.write("watchrugby.top\n")
        print(f"  ✓ CNAME → watchrugby.top")
        changed.append("CNAME")

if not changed:
    print("Nothing to rename.")
    sys.exit(0)

print("\n=== git status ===")
subprocess.run(["git", "status"], cwd=ROOT)
print("\n=== git diff --stat ===")
subprocess.run(["git", "diff", "--stat"], cwd=ROOT)
