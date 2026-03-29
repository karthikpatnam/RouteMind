import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load .env from the backend directory
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")

# Initializes the Supabase client safely if keys exist
# Otherwise falls back to None so the rest of the app doesn't crash
if url and key:
    supabase: Client = create_client(url, key)
else:
    supabase = None
