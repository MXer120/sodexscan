"""
SodexScan Discord Ticket Bot

Monitors ticket channels in a specific category, logs messages to Supabase,
auto-extracts wallet/TX IDs, and proxies attachments to permanent storage.

Usage:
    cp .env.example .env   # fill in values
    pip install -r requirements.txt
    python bot.py
"""

import os
import asyncio
import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import discord
from discord.ext import commands, tasks
from dotenv import load_dotenv

from config import (
    TICKET_CATEGORY_ID,
    IGNORE_CHANNELS,
    MOD_ROLE_ID,
    QUIET_TZ,
    QUIET_START_HOUR,
    QUIET_END_HOUR,
    FALLBACK_POLL_INTERVAL,
    FULL_SYNC_INTERVAL,
    HISTORY_FETCH_LIMIT,
    PAUSE_TICKET_SYNC,
)
from db import (
    upsert_ticket,
    get_ticket_by_channel,
    close_ticket,
    update_ticket_extracted,
    get_all_ticket_channel_ids,
    upsert_message,
    mark_message_deleted,
    get_latest_message_ts,
    upsert_discord_user,
)
from extractor import extract_all
from storage import proxy_attachment

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("ticket-bot")

TOKEN = os.getenv("DISCORD_BOT_TOKEN", "")

# ── Discord client setup ────────────────────────────────────

intents = discord.Intents.default()
intents.message_content = True
intents.messages = True
intents.guilds = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)


# ── Helpers ─────────────────────────────────────────────────

def is_quiet_hour() -> bool:
    """Check if current time is in the quiet window (06:00-07:00 UTC+3)."""
    now = datetime.now(ZoneInfo(QUIET_TZ))
    return QUIET_START_HOUR <= now.hour < QUIET_END_HOUR


def is_ticket_channel(channel: discord.TextChannel) -> bool:
    """Check if a channel belongs to the monitored ticket category."""
    return (
        hasattr(channel, "category_id")
        and channel.category_id == TICKET_CATEGORY_ID
        and channel.id not in IGNORE_CHANNELS
    )


def author_is_mod(member: discord.Member) -> bool:
    """Check if a member has the mod role."""
    if not member or not hasattr(member, "roles"):
        return False
    return any(r.id == MOD_ROLE_ID for r in member.roles)


def get_avatar_url(user: discord.User | discord.Member) -> str | None:
    """Get the user's avatar URL."""
    if user.avatar:
        return str(user.avatar.url)
    return None


async def process_discord_message(
    msg: discord.Message,
    ticket_id: int,
    is_edit: bool = False,
):
    """Process a single Discord message: extract data, proxy attachments, save."""
    # Proxy attachments to Supabase Storage
    attachment_list = []
    for att in msg.attachments:
        permanent_url = await proxy_attachment(
            att.url, ticket_id, str(msg.id), att.filename
        )
        attachment_list.append({
            "url": permanent_url or att.url,
            "filename": att.filename,
            "content_type": att.content_type,
            "size": att.size,
        })

    # Save message
    upsert_message(
        ticket_id=ticket_id,
        message_id=str(msg.id),
        content=msg.content,
        author_id=str(msg.author.id),
        author_name=msg.author.display_name or msg.author.name,
        timestamp=msg.created_at.replace(tzinfo=timezone.utc) if msg.created_at.tzinfo is None else msg.created_at,
        attachments=attachment_list,
        is_edit=is_edit,
    )

    # Save discord user
    upsert_discord_user(
        user_id=str(msg.author.id),
        username=msg.author.name,
        display_name=msg.author.display_name,
        avatar_url=get_avatar_url(msg.author),
        is_mod=author_is_mod(msg.author) if isinstance(msg.author, discord.Member) else False,
    )

    # Extract wallet/TX from content
    if msg.content:
        extracted = extract_all(msg.content)
        if extracted["wallets"] or extracted["tx_ids"]:
            update_ticket_extracted(ticket_id, extracted["wallets"], extracted["tx_ids"])


async def ensure_ticket(channel: discord.TextChannel) -> int | None:
    """Ensure a ticket exists for this channel. Returns ticket_id."""
    existing = get_ticket_by_channel(str(channel.id))
    if existing:
        return existing["id"]

    # Determine opener from channel creation
    # The first message in the channel is typically from the ticket system
    open_date = channel.created_at
    if open_date and open_date.tzinfo is None:
        open_date = open_date.replace(tzinfo=timezone.utc)

    ticket_id = upsert_ticket(
        channel_id=str(channel.id),
        channel_name=channel.name,
        open_date=open_date,
    )
    return ticket_id


# ── Events ──────────────────────────────────────────────────

@bot.event
async def on_ready():
    log.info(f"Logged in as {bot.user} (ID: {bot.user.id})")
    log.info(f"Monitoring category: {TICKET_CATEGORY_ID}")
    log.info(f"Ignoring channels: {IGNORE_CHANNELS}")

    # Start background tasks
    if not PAUSE_TICKET_SYNC:
        if not fallback_poll.is_running():
            fallback_poll.start()
        if not full_sync.is_running():
            full_sync.start()
        # Do an initial full sync
        await do_full_sync()
    else:
        log.info("[SYNC] PAUSE_TICKET_SYNC=True — background polling disabled")


@bot.event
async def on_message(message: discord.Message):
    if PAUSE_TICKET_SYNC:
        return
    if is_quiet_hour():
        return
    if message.author.bot:
        return
    if not isinstance(message.channel, discord.TextChannel):
        return
    if not is_ticket_channel(message.channel):
        return

    ticket_id = await ensure_ticket(message.channel)
    if not ticket_id:
        return

    # Detect opener: first non-bot user in channel
    ticket = get_ticket_by_channel(str(message.channel.id))
    if ticket and not ticket.get("opener_discord_id"):
        upsert_ticket(
            channel_id=str(message.channel.id),
            opener_discord_id=str(message.author.id),
        )

    await process_discord_message(message, ticket_id)
    log.info(f"[MSG] #{message.channel.name} by {message.author.name}")


@bot.event
async def on_message_edit(before: discord.Message, after: discord.Message):
    if PAUSE_TICKET_SYNC:
        return
    if is_quiet_hour():
        return
    if after.author.bot:
        return
    if not isinstance(after.channel, discord.TextChannel):
        return
    if not is_ticket_channel(after.channel):
        return

    ticket = get_ticket_by_channel(str(after.channel.id))
    if not ticket:
        return

    await process_discord_message(after, ticket["id"], is_edit=True)
    log.info(f"[EDIT] #{after.channel.name} by {after.author.name}")


@bot.event
async def on_message_delete(message: discord.Message):
    if PAUSE_TICKET_SYNC:
        return
    if is_quiet_hour():
        return
    if not isinstance(message.channel, discord.TextChannel):
        return
    if not is_ticket_channel(message.channel):
        return

    mark_message_deleted(str(message.id))
    log.info(f"[DEL] #{message.channel.name} msg {message.id}")


@bot.event
async def on_guild_channel_delete(channel: discord.abc.GuildChannel):
    if PAUSE_TICKET_SYNC:
        return
    if is_quiet_hour():
        return
    if not isinstance(channel, discord.TextChannel):
        return
    if not is_ticket_channel(channel):
        return

    close_ticket(str(channel.id))
    log.info(f"[CLOSED] #{channel.name} (channel deleted)")


# ── Background Tasks ────────────────────────────────────────

@tasks.loop(seconds=FALLBACK_POLL_INTERVAL)
async def fallback_poll():
    """Fallback: poll ticket channels for new messages every minute."""
    if is_quiet_hour():
        return

    for guild in bot.guilds:
        for channel in guild.text_channels:
            if not is_ticket_channel(channel):
                continue

            ticket = get_ticket_by_channel(str(channel.id))
            if not ticket:
                continue

            # Get latest stored message timestamp
            latest_ts = get_latest_message_ts(ticket["id"])
            after_dt = latest_ts if latest_ts else None

            try:
                async for msg in channel.history(limit=50, after=after_dt, oldest_first=True):
                    if msg.author.bot:
                        continue
                    await process_discord_message(msg, ticket["id"])
            except discord.Forbidden:
                log.warning(f"[POLL] No access to #{channel.name}")
            except Exception as e:
                log.error(f"[POLL] Error in #{channel.name}: {e}")


@fallback_poll.before_loop
async def before_fallback():
    await bot.wait_until_ready()


@tasks.loop(seconds=FULL_SYNC_INTERVAL)
async def full_sync():
    """Full channel sweep every 5 minutes."""
    if is_quiet_hour():
        return
    await do_full_sync()


@full_sync.before_loop
async def before_full_sync():
    await bot.wait_until_ready()


async def do_full_sync():
    """Sync all ticket channels: ensure tickets exist, fetch history.
    Also detect and close tickets whose channels no longer exist in Discord.
    """
    log.info("[SYNC] Starting full sync...")
    count = 0

    # Collect all current Discord ticket channel IDs
    live_channel_ids = set()

    for guild in bot.guilds:
        for channel in guild.text_channels:
            if not is_ticket_channel(channel):
                continue

            live_channel_ids.add(str(channel.id))

            try:
                ticket_id = await ensure_ticket(channel)
            except Exception as e:
                log.error(f"[SYNC] ensure_ticket failed for #{channel.name}: {e}")
                continue
            if not ticket_id:
                continue

            # Detect opener from first message if not set
            # Reuse ensure_ticket's lookup instead of querying again
            existing = get_ticket_by_channel(str(channel.id))
            if existing and not existing.get("opener_discord_id"):
                try:
                    async for msg in channel.history(limit=1, oldest_first=True):
                        if not msg.author.bot:
                            upsert_ticket(
                                channel_id=str(channel.id),
                                opener_discord_id=str(msg.author.id),
                            )
                except Exception:
                    pass

            # Fetch recent history
            latest_ts = get_latest_message_ts(ticket_id)
            try:
                msgs = []
                async for msg in channel.history(
                    limit=HISTORY_FETCH_LIMIT,
                    after=latest_ts,
                    oldest_first=True,
                ):
                    if msg.author.bot:
                        continue
                    msgs.append(msg)

                for msg in msgs:
                    await process_discord_message(msg, ticket_id)
                    count += 1

            except discord.Forbidden:
                log.warning(f"[SYNC] No access to #{channel.name}")
            except Exception as e:
                log.error(f"[SYNC] Error in #{channel.name}: {e}")

    # Close stale tickets: open in DB but channel no longer exists in Discord
    stale_closed = 0
    open_channel_ids = get_all_ticket_channel_ids()
    for ch_id in open_channel_ids:
        if ch_id not in live_channel_ids:
            close_ticket(ch_id)
            stale_closed += 1
            log.info(f"[SYNC] Auto-closed stale ticket (channel {ch_id} gone)")

    log.info(f"[SYNC] Done. {count} msgs processed, {stale_closed} stale tickets closed.")


# ── Entry point ─────────────────────────────────────────────

if __name__ == "__main__":
    if not TOKEN:
        print("ERROR: DISCORD_BOT_TOKEN not set in .env")
        exit(1)
    bot.run(TOKEN)
