"""Bot configuration constants."""

# Discord channel/category IDs
TICKET_CATEGORY_ID = 1153949692770664450

# Channels to completely ignore
IGNORE_CHANNELS = {
    1407628434007523348,
    1153933174708109432,
    1448871580741406810,
}

# Discord role ID that identifies moderators
MOD_ROLE_ID = 1443449810941378680

# Quiet hours: NO activity from 06:00 to 07:00 UTC+3
# Europe/Istanbul is a stable UTC+3 zone (no DST)
QUIET_TZ = "Europe/Istanbul"
QUIET_START_HOUR = 6
QUIET_END_HOUR = 7

# Polling intervals (seconds)
FALLBACK_POLL_INTERVAL = 60      # 1 min fallback poll
FULL_SYNC_INTERVAL = 300         # 5 min full channel sweep
HISTORY_FETCH_LIMIT = 200        # Max messages per history fetch
