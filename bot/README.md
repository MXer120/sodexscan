# SodexScan Discord Ticket Bot

Monitors ticket channels, logs to Supabase, extracts wallets/TXs, proxies attachments.

## Setup

```bash
# 1. Copy bot files to server
scp -r bot/ user@vps:/opt/sodexscan-bot/

# 2. SSH into server
ssh user@vps

# 3. Create venv & install deps
cd /opt/sodexscan-bot
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 4. Configure env
cp .env.example .env
nano .env  # fill in DISCORD_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY

# 5. Test run
python bot.py

# 6. Install systemd service
sudo cp sodexscan-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable sodexscan-bot
sudo systemctl start sodexscan-bot

# 7. Check logs
sudo journalctl -u sodexscan-bot -f
```

## Discord Bot Setup

1. Go to https://discord.com/developers/applications
2. Create application → Bot tab → Reset Token → copy to .env
3. Enable intents: Message Content, Server Members, Guild Messages
4. Invite to server with permissions: Read Messages, Read Message History, View Channels

## Architecture

- `bot.py` — Main entry: events (on_message, on_edit, on_delete) + background tasks
- `config.py` — IDs, quiet hours, intervals
- `db.py` — Supabase CRUD (service role, bypasses RLS)
- `storage.py` — Proxy Discord attachments → Supabase Storage
- `extractor.py` — Regex wallet/TX extraction

## Quiet Hours

Bot goes completely silent 06:00-07:00 UTC+3 (Europe/Istanbul timezone). All events and tasks early-return during this window.
