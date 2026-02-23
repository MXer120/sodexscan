"""Supabase database operations for the Discord ticket bot.

Uses the service role key to bypass RLS (bot writes directly).
"""

import os
from datetime import datetime, timezone
from supabase import create_client, Client

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_KEY", "")
        _client = create_client(url, key)
    return _client


# ── Tickets ─────────────────────────────────────────────────

def upsert_ticket(
    channel_id: str,
    channel_name: str | None = None,
    open_date: datetime | None = None,
    opener_discord_id: str | None = None,
    **fields,
) -> int | None:
    """
    Insert or update a ticket by channel_id.
    Returns the ticket ID.
    """
    sb = get_client()
    row = {
        "channel_id": channel_id,
    }
    if channel_name:
        row["channel_name"] = channel_name
    if open_date:
        row["open_date"] = open_date.isoformat()
    if opener_discord_id:
        row["opener_discord_id"] = opener_discord_id

    # Merge extra fields (wallet_address, tx_id, etc.)
    for k, v in fields.items():
        if v is not None:
            row[k] = v

    result = (
        sb.table("tickets")
        .upsert(row, on_conflict="channel_id")
        .execute()
    )
    if result.data:
        return result.data[0]["id"]
    return None


def get_ticket_by_channel(channel_id: str) -> dict | None:
    sb = get_client()
    try:
        result = (
            sb.table("tickets")
            .select("*")
            .eq("channel_id", channel_id)
            .limit(1)
            .execute()
        )
        if result and result.data and len(result.data) > 0:
            return result.data[0]
    except Exception as e:
        print(f"[db] get_ticket_by_channel error: {e}")
    return None


def close_ticket(channel_id: str):
    """Mark a ticket as closed."""
    sb = get_client()
    sb.table("tickets").update({
        "status": "closed",
        "close_date": datetime.now(timezone.utc).isoformat(),
    }).eq("channel_id", channel_id).execute()


def update_ticket_extracted(ticket_id: int, wallets: list[str], tx_ids: list[str]):
    """Update ticket with extracted wallet/tx if not already set."""
    sb = get_client()
    try:
        result = sb.table("tickets").select("wallet_address, tx_id").eq("id", ticket_id).limit(1).execute()
        if not result or not result.data or len(result.data) == 0:
            return
        ticket_data = result.data[0]

        updates = {}
        if not ticket_data.get("wallet_address") and wallets:
            updates["wallet_address"] = wallets[0]
        if not ticket_data.get("tx_id") and tx_ids:
            updates["tx_id"] = tx_ids[0]

        if updates:
            sb.table("tickets").update(updates).eq("id", ticket_id).execute()
    except Exception as e:
        print(f"[db] update_ticket_extracted error: {e}")


def get_all_ticket_channel_ids() -> list[str]:
    """Get all open ticket channel IDs for sync."""
    sb = get_client()
    result = sb.table("tickets").select("channel_id").eq("status", "open").execute()
    return [r["channel_id"] for r in (result.data or [])]


# ── Messages ────────────────────────────────────────────────

def upsert_message(
    ticket_id: int,
    message_id: str,
    content: str | None,
    author_id: str,
    author_name: str,
    timestamp: datetime,
    attachments: list[dict] | None = None,
    is_edit: bool = False,
):
    """Insert or update a message."""
    sb = get_client()
    row = {
        "ticket_id": ticket_id,
        "message_id": message_id,
        "content": content,
        "author_id": author_id,
        "author_name": author_name,
        "timestamp": timestamp.isoformat(),
        "attachments": attachments or [],
        "is_edit": is_edit,
    }
    sb.table("ticket_messages").upsert(
        row, on_conflict="ticket_id,message_id"
    ).execute()


def mark_message_deleted(message_id: str):
    """Mark a message as deleted."""
    sb = get_client()
    sb.table("ticket_messages").update({
        "is_deleted": True,
    }).eq("message_id", message_id).execute()


def get_latest_message_ts(ticket_id: int) -> datetime | None:
    """Get the latest message timestamp for a ticket."""
    sb = get_client()
    result = (
        sb.table("ticket_messages")
        .select("timestamp")
        .eq("ticket_id", ticket_id)
        .order("timestamp", desc=True)
        .limit(1)
        .execute()
    )
    if result.data:
        return datetime.fromisoformat(result.data[0]["timestamp"])
    return None


# ── Discord Users ───────────────────────────────────────────

def upsert_discord_user(
    user_id: str,
    username: str | None = None,
    display_name: str | None = None,
    avatar_url: str | None = None,
    is_mod: bool = False,
):
    """Insert or update a Discord user."""
    sb = get_client()
    row = {"id": user_id, "is_mod": is_mod}
    if username is not None:
        row["username"] = username
    if display_name is not None:
        row["display_name"] = display_name
    if avatar_url is not None:
        row["avatar_url"] = avatar_url

    sb.table("discord_users").upsert(row, on_conflict="id").execute()
