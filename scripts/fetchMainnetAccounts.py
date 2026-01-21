import requests
import csv
import time

def main():
    """Scan account IDs 950-2000 and save to CSV"""
    results = []

    print("Scanning mainnet account IDs 950-2000...")
    print("Using endpoint: https://sodex.dev/mainnet/chain/user/{id}/address")

    for account_id in range(3083, 3088):
        url = f"https://sodex.dev/mainnet/chain/user/{account_id}/address"

        try:
            response = requests.get(url, timeout=10)
            data = response.json()

            if data.get('code') == 0 and data.get('data'):
                address = data['data'].get('address')
                if address:
                    results.append({
                        'account_id': account_id,
                        'address': address
                    })
                    print(f"Found: {account_id} -> {address[:10]}...")

            if account_id % 100 == 0:
                print(f"Progress: {account_id}/2000...")

        except Exception as e:
            print(f"Error at {account_id}: {e}")

        # Rate limiting - 50ms delay
        time.sleep(0.05)

    # Save to CSV
    output_file = 'mainnet_accounts.csv'
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Account ID', 'Address'])
        for result in results:
            writer.writerow([result['account_id'], result['address']])

    print(f"\nDone! Found {len(results)} accounts with addresses")
    print(f"Saved to {output_file}")
    print("Move this file to public/data/mainnet_accounts.csv")

if __name__ == '__main__':
    main()
