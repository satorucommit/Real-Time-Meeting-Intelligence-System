"""
whisper_server.py
A minimal Flask HTTP server wrapping openai-whisper.
Run with: python whisper_server.py
Listens on: http://localhost:9000
"""

import os
import sys
import shutil
import tempfile
import threading

# ── FFmpeg Setup ──────────────────────────────────────────────
_ffmpeg_dir = None
try:
    import imageio_ffmpeg
    real_exe = imageio_ffmpeg.get_ffmpeg_exe()
    _ffmpeg_dir = tempfile.mkdtemp(prefix="whisper_ffmpeg_")
    alias_path = os.path.join(_ffmpeg_dir, "ffmpeg.exe")
    shutil.copy2(real_exe, alias_path)
    os.environ["PATH"] = _ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
    print(f"[whisper] FFmpeg ready: {alias_path}", flush=True)
except ImportError:
    print("[whisper] Using system FFmpeg", flush=True)
except Exception as e:
    print(f"[whisper] FFmpeg setup warning: {e}", flush=True)

# ── Whisper + Flask ───────────────────────────────────────────
import whisper
from flask import Flask, request, jsonify

app = Flask(__name__)

MODEL_SIZE = os.environ.get("WHISPER_MODEL", "base")
print(f"[whisper] Loading model '{MODEL_SIZE}'...", flush=True)
model = whisper.load_model(MODEL_SIZE)
print(f"[whisper] Model ready.", flush=True)

# CRITICAL: Whisper model is NOT thread-safe (shared kv_cache).
# Serialize all transcription calls with a lock.
transcribe_lock = threading.Lock()

# Minimum audio file size to attempt transcription (skip near-empty chunks)
MIN_AUDIO_BYTES = 10000  # ~10KB


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": MODEL_SIZE})


@app.route("/transcribe", methods=["POST"])
def transcribe():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["audio"]

    # Read into memory first to check size
    audio_data = audio_file.read()
    
    if len(audio_data) < MIN_AUDIO_BYTES:
        # Audio chunk too small — likely silence or mic warm-up
        return jsonify({"text": ""})

    # Save to temp file
    suffix = "." + (audio_file.filename.rsplit(".", 1)[-1] if audio_file.filename and "." in audio_file.filename else "webm")
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(tmp_fd, 'wb') as f:
            f.write(audio_data)

        # Serialize access to the model
        with transcribe_lock:
            result = model.transcribe(tmp_path, fp16=False, language="en")

        text = result.get("text", "").strip()
        
        if text:
            print(f"[whisper] ✅ \"{text[:100]}{'...' if len(text)>100 else ''}\"", flush=True)
        else:
            print(f"[whisper] (silence/no speech detected)", flush=True)
            
        return jsonify({"text": text})
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[whisper] ❌ Error: {e}", flush=True)
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


if __name__ == "__main__":
    port = int(os.environ.get("WHISPER_PORT", 9000))
    print(f"[whisper] Server on http://localhost:{port}", flush=True)
    print(f"[whisper] Min audio size: {MIN_AUDIO_BYTES} bytes", flush=True)
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
