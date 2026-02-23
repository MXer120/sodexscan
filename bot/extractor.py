"""Regex-based extraction of wallet addresses and transaction IDs from text."""

import re

# Wallet: 0x followed by exactly 40 hex chars (Ethereum-style)
WALLET_PATTERN = re.compile(r'\b(0x[a-fA-F0-9]{40})\b')

# TX ID: 0x followed by exactly 64 hex chars (transaction hash)
TX_PATTERN = re.compile(r'\b(0x[a-fA-F0-9]{64})\b')


def extract_wallets(text: str) -> list[str]:
    """Extract all wallet addresses from text, excluding TX hashes."""
    if not text:
        return []
    # Find all 0x-prefixed hex strings
    all_matches = re.findall(r'\b(0x[a-fA-F0-9]{40,64})\b', text)
    # Only keep those that are exactly 42 chars (0x + 40 hex)
    return list(set(m for m in all_matches if len(m) == 42))


def extract_tx_ids(text: str) -> list[str]:
    """Extract all transaction IDs from text."""
    if not text:
        return []
    return list(set(TX_PATTERN.findall(text)))


def extract_all(text: str) -> dict:
    """Extract wallets and tx_ids from text."""
    return {
        'wallets': extract_wallets(text),
        'tx_ids': extract_tx_ids(text),
    }
