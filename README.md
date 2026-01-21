# Pukai Stats

Next.js app for tracking wallet activity and mainnet stats.

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local and set CRON_SECRET
npm run dev
```

## Deployment

Deploy to Vercel:
1. Connect repo to Vercel
2. Set environment variable: `CRON_SECRET` (generate random string)
3. Cron runs every 6 hours via `/api/cron` (configured in vercel.json)

## Structure

```
app/
├── api/cron/route.js    # Auto-refresh endpoint
├── components/          # React components
├── styles/              # CSS files
├── data/                # JSON data
├── utils/               # Utilities
├── layout.js            # Root layout
├── page.js              # Landing page
├── tracker/page.js      # Tracker page
└── mainnet/page.js      # Mainnet page
```

## Routes

- `/` - Landing
- `/tracker` - Wallet tracker
- `/mainnet` - Mainnet stats
