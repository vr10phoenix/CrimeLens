# download_bge_m3.py
import os
import sys
from huggingface_hub import snapshot_download

MODEL_ID = "BAAI/bge-m3"
print(f"Downloading the complete model {MODEL_ID} ...")

# Optional: set your HF token for faster download (create at https://huggingface.co/settings/tokens)
# os.environ["HF_TOKEN"] = "hf_xxxxxxxx"

try:
    snapshot_download(
        repo_id=MODEL_ID,
        resume_download=True,   # continue if interrupted
        local_files_only=False,  # fetch from hub
        ignore_patterns=None,    # download everything
    )
    print("✅ All model files downloaded and cached successfully.")
except Exception as e:
    print(f"❌ Download failed: {e}")
    sys.exit(1)