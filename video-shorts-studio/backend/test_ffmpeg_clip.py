import sys
import os
from pathlib import Path

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi_backend import _build_drawtext_filter, run_ffmpeg, SYSTEM_FONT, OUTPUT_DIR, SubtitleOptions

video_path = OUTPUT_DIR / "test-yt-clip" / "source.mp4"
if not video_path.exists():
    print(f"Error: Video does not exist at {video_path}. Run scratch_test_yt.py first.")
    sys.exit(1)

clips_dir = OUTPUT_DIR / "test-yt-clip" / "clips"
clips_dir.mkdir(exist_ok=True)

clip_out = clips_dir / "clip_000.mp4"
temp_txt_path = clips_dir / "caption_000.txt"

# Test segment: start 12.0, end 17.0 (duration 5.0)
start = 12.0
end = 17.0
duration = end - start
caption = "Teste de legenda para o vídeo vertical!"

vf = "crop=ih*9/16:ih:(iw-ow)/2:0,scale=1080:1920,fps=30"
vf += ",vignette=angle=0.12,noise=alls=5:allf=t+u,eq=contrast=1.03:saturation=1.05"

sub_opts = SubtitleOptions(style="yellow_premium", position="bottom", fontSize=52)

drawtext_filter = _build_drawtext_filter(
    text=caption,
    font_path=SYSTEM_FONT,
    subtitle_options=sub_opts,
    temp_txt_path=temp_txt_path
)

if drawtext_filter:
    vf += f",{drawtext_filter}"

# Build cmd
from fastapi_backend import format_timestamp
cmd = [
    "-ss", format_timestamp(start),
    "-i", str(video_path),
    "-t", format_timestamp(duration),
    "-vf", vf,
    "-c:a", "aac",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-y", str(clip_out)
]

print("Running FFmpeg command:")
print("ffmpeg", "-y", " ".join(cmd))

ret, stdout, stderr = run_ffmpeg(cmd)
print("\nReturn code:", ret)
if ret == 0 and clip_out.exists():
    print("Success! Clip created at:", clip_out)
    print("Size:", clip_out.stat().st_size, "bytes")
else:
    print("Failed!")
    print("Stderr:", stderr[:1000])
