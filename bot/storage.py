"""Download Discord attachments and upload to Supabase Storage."""

import httpx
import os
from supabase import create_client

BUCKET = "ticket-attachments"

_storage_client = None


def get_storage_client():
    global _storage_client
    if _storage_client is None:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_KEY", "")
        _storage_client = create_client(url, key)
    return _storage_client


async def proxy_attachment(
    discord_url: str,
    ticket_id: int,
    message_id: str,
    filename: str,
) -> str | None:
    """
    Download file from Discord CDN and upload to Supabase Storage.
    Returns the permanent public URL or None on failure.
    """
    try:
        # Download from Discord
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(discord_url)
            resp.raise_for_status()
            file_bytes = resp.content
            content_type = resp.headers.get("content-type", "application/octet-stream")

        # Build storage path: ticket-{id}/{message_id}/{filename}
        safe_name = filename.replace(" ", "_")[:100]
        path = f"ticket-{ticket_id}/{message_id}/{safe_name}"

        sb = get_storage_client()
        # Upload (upsert to handle re-runs)
        sb.storage.from_(BUCKET).upload(
            path,
            file_bytes,
            file_options={"content-type": content_type, "upsert": "true"},
        )

        # Get permanent public URL
        public_url = sb.storage.from_(BUCKET).get_public_url(path)
        return public_url

    except Exception as e:
        print(f"[storage] Failed to proxy attachment {filename}: {e}")
        return None
