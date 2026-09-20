"""Replace all non-ASCII chars in fastapi_backend.py with ASCII equivalents."""
import sys
from pathlib import Path

filepath = Path(__file__).parent / "fastapi_backend.py"
content = filepath.read_text("utf-8")

# Build translation table: all chars > 127 map to closest ASCII
# Portuguese accent mapping
accent_map = {
    0x00e1: "a", 0x00e0: "a", 0x00e3: "a", 0x00e2: "a", 0x00e4: "a",
    0x00e9: "e", 0x00ea: "e", 0x00e8: "e", 0x00eb: "e",
    0x00ed: "i", 0x00ee: "i", 0x00ec: "i",
    0x00f3: "o", 0x00f5: "o", 0x00f4: "o", 0x00f2: "o", 0x00f6: "o",
    0x00fa: "u", 0x00fb: "u", 0x00f9: "u", 0x00fc: "u",
    0x00e7: "c",
    0x00f1: "n",
    0x00c1: "A", 0x00c0: "A", 0x00c3: "A", 0x00c2: "A", 0x00c4: "A",
    0x00c9: "E", 0x00ca: "E", 0x00c8: "E", 0x00cb: "E",
    0x00cd: "I", 0x00ce: "I", 0x00cc: "I",
    0x00d3: "O", 0x00d5: "O", 0x00d4: "O", 0x00d2: "O", 0x00d6: "O",
    0x00da: "U", 0x00db: "U", 0x00d9: "U", 0x00dc: "U",
    0x00c7: "C",
    0x00d1: "N",
}

# Symbol replacements
symbol_map = {
    0x2014: "-",    # em dash
    0x2013: "-",    # en dash
    0x2192: "->",   # right arrow
    0x2713: "[OK]", # checkmark
    0x2714: "[OK]",
    0x26a0: "[WARN]",
    0xfe0f: "",     # variation selector
    0x00b0: " deg", # degree sign
    0x00bf: "?",    # inverted question mark
    0x00a1: "!",    # inverted exclamation
    0x2018: "'",    # left single quote
    0x2019: "'",    # right single quote
    0x201c: '"',    # left double quote
    0x201d: '"',    # right double quote
    0x2026: "...",  # ellipsis
    0x00ab: "<<",   # left angle quote
    0x00bb: ">>",   # right angle quote
}

# Also handle box-drawing and other special chars
for code in range(0x2500, 0x2580):
    symbol_map[code] = "-"

# Build full translation
all_codes = {}
all_codes.update(accent_map)
all_codes.update(symbol_map)

# Also map any remaining non-ASCII to nothing
result = []
count = 0
for ch in content:
    code = ord(ch)
    if code > 127:
        replacement = all_codes.get(code, "")
        if replacement:
            result.append(replacement)
            count += 1
        else:
            count += 1
    else:
        result.append(ch)

new_content = "".join(result)

filepath.write_text(new_content, "utf-8")
print(f"Replaced {count} non-ASCII characters")

# Verify
remaining = sum(1 for ch in new_content if ord(ch) > 127)
if remaining:
    print(f"WARNING: {remaining} non-ASCII chars still remain!")
else:
    print("ALL ASCII - OK!")
