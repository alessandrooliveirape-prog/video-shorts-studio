import sys
import os
from pathlib import Path

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi_backend import _get_youtube_data_and_transcript, OUTPUT_DIR
import subprocess

print("Output dir:", OUTPUT_DIR)
# Let's test _get_youtube_data_and_transcript and direct yt-dlp download
url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
temp_dir = OUTPUT_DIR / "test-yt-clip"
temp_dir.mkdir(parents=True, exist_ok=True)

print("1. Extracting data and transcript...")
try:
    transcript = _get_youtube_data_and_transcript(url, temp_dir)
    print("Transcript extracted:", len(transcript), "chars")
    print("Transcript preview:", transcript[:300])
except Exception as e:
    print("Error during _get_youtube_data_and_transcript:", e)

print("\n2. Downloading video...")
video_path = temp_dir / "source.mp4"
try:
    # Let's run with stdout/stderr captured but NOT quiet to see details if it fails
    res = subprocess.run(
        ["yt-dlp", "-f", "best[height<=720]", "-o", str(video_path),
         "--no-playlist", url],
        capture_output=True, text=True, timeout=180, check=True,
    )
    print("Download completed. Video exists:", video_path.exists())
    if video_path.exists():
        print("Video size:", video_path.stat().st_size)
except Exception as e:
    print("Error during download:", e)
    if hasattr(e, 'stderr') and e.stderr:
        print("Stderr:", e.stderr)
    if hasattr(e, 'stdout') and e.stdout:
        print("Stdout:", e.stdout)
