import requests
import csv
import time

INPUT_FILE = 'mainnet_accounts.csv'
OUTPUT_FILE = 'mainnet_leaderboard.csv'
ENDPOINT = 'https://mainnet-data.sodex.dev/api/v1/perps/pnl/overview'

def fetch_pnl(account_id):
    """Fetch PnL and volume for a single account"""
    try:
        response = requests.get(f"{ENDPOINT}?account_id={account_id}", timeout=10)
        if response.status_code == 200:
            result = response.json()
            if result.get('code') == 0 and result.get('data'):
                data = result['data']
                pnl = data.get('cumulative_pnl', '0')
                volume = data.get('cumulative_quote_volume', '0')
                return pnl, volume
            else:
                return '0', '0'
        else:
            print(f"\nFailed to fetch {account_id}: {response.status_code}")
            return '0', '0'
    except Exception as e:
        print(f"\nError fetching {account_id}: {e}")
        return '0', '0'

def main():
    # Read accounts
    accounts = []
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        accounts = list(reader)

    print(f"Processing {len(accounts)} accounts...")

    results = []
    for i, account in enumerate(accounts, 1):
        account_id = account['Account ID']
        address = account['Address']

        print(f"\rFetching {i}/{len(accounts)}: {account_id}...", end='', flush=True)

        pnl, volume = fetch_pnl(account_id)
        results.append({
            'walletAddress': address,
            'pnl': pnl,
            'volume': volume
        })

        # Rate limiting
        time.sleep(0.1)

    print("\n\nSorting by PnL (descending)...")
    results.sort(key=lambda x: float(x['pnl']), reverse=True)

    print("Writing to CSV...")
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['walletAddress', 'pnl', 'volume'], quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(results)

    print(f"\nDone! Wrote {len(results)} accounts to {OUTPUT_FILE}")

if __name__ == '__main__':
    main()
