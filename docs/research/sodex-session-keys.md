# Research: Sodex Session Keys & EIP-712 Delegation

## Status: Spike — Pending Sodex Docs Confirmation

**Decision gate**: before implementing any delegation UI beyond the stub,
we must confirm which on-chain primitives Sodex exposes.

---

## Questions to Answer

1. **Account abstraction**: Does Sodex mainnet use ERC-4337 (or a custom AA variant)?
   - Check: deployed `EntryPoint` contract at `sodex.dev/mainnet/chain/...`
   - Look for `UserOperation` struct support in gateway API

2. **EIP-712 permit structure**: Is there a typed-data signature scheme for:
   - Placing a perps order (symbol, side, size, price, expiry)?
   - Scoped to a single symbol / max notional / no-withdraw?
   - Check: `mainnet-gw.sodex.dev/futures/fapi/user/v1/...` — any `/sign` or `/order/prepare` endpoints?

3. **Native delegation / session keys**:
   - Does Sodex support sub-accounts or permission delegation natively?
   - Any `account_flow` endpoint on `alpha-biz.sodex.dev/biz/mirror/account_flow` that hints at mirroring?

4. **Revocation path**:
   - On-chain: can a permit be cancelled by a second tx before expiry?
   - Off-chain: does the gateway accept a "cancel session key" call?

---

## Known Sodex Endpoints (from codebase grep)

| Endpoint | Purpose | Notes |
|---|---|---|
| `mainnet-gw.sodex.dev/futures/fapi/market/v1/public/leverage/bracket/list` | Leverage brackets | Public, no auth |
| `mainnet-gw.sodex.dev/futures/fapi/market/v1/public/symbol/list` | Symbol list | Public |
| `mainnet-data.sodex.dev/api/v1/perps/pnl/overview` | PnL overview | Read, account_id |
| `mainnet-gw.sodex.dev/futures/fapi/user/v1/public/account/details` | Account details | Read, accountId |
| `mainnet-data.sodex.dev/api/v1/perps/pnl/daily_stats` | Daily PnL | Read |
| `alpha-biz.sodex.dev/biz/mirror/account_flow` | Mirror account flow | **Interesting** — may be delegation |
| `mainnet-gw.sodex.dev/pro/p/user/balance/list` | Balances | Read |
| `mainnet-data.sodex.dev/api/v1/perps/positions` | Open positions | Read |
| `sodex.dev/mainnet/chain/user/{id}/fund-transfers` | Fund transfers | Read |

The `alpha-biz.sodex.dev/biz/mirror/account_flow` endpoint is the most interesting lead —
"mirror" strongly suggests copy/delegation functionality. **Needs API docs review.**

---

## Proposed EIP-712 Type Schema (Placeholder)

If Sodex supports typed signatures, the permit would look like:

```javascript
// app/lib/delegation/eip712Schemas.js
const DOMAIN = {
  name: 'SodexPerps',
  version: '1',
  chainId: /* Sodex mainnet chain ID — TBD */,
  verifyingContract: '0x0000…', // TBD: Sodex perps contract
}

const ORDER_PERMIT_TYPE = {
  OrderPermit: [
    { name: 'symbol',      type: 'string'  },
    { name: 'side',        type: 'string'  }, // 'long' | 'short'
    { name: 'maxSize',     type: 'uint256' }, // wei-scaled notional
    { name: 'maxPrice',    type: 'uint256' }, // price tolerance
    { name: 'expiry',      type: 'uint256' }, // unix timestamp (≤ now + 5min)
    { name: 'nonce',       type: 'uint256' }, // replay protection
    { name: 'noWithdraw',  type: 'bool'    }, // must be true
  ],
}
```

**Security invariants (enforce in contract/gateway)**:
- `noWithdraw` MUST be `true` — permit cannot authorize any fund withdrawal
- `expiry` MUST be ≤ now + 300 seconds (5 min)
- One permit per trade — no blanket authorization
- Server relays to gateway and discards permit immediately; never stored

---

## Implementation Plan (Conditional on Research Findings)

### If Sodex supports on-chain session keys:
1. Implement `eip712Schemas.js` with confirmed domain + types
2. `SessionKeyDelegation.jsx` calls `wallet.signTypedData(domain, types, value)`
3. Backend relays signed permit to Sodex gateway (POST with signature header)
4. On-chain revocation via contract call if supported

### If Sodex uses scoped API keys (HMAC):
1. User generates a Sodex API key scoped to perps-trade only (no withdraw)
2. Key passed client-side only to our relay; never persisted server-side
3. Relay holds key only for the duration of the order submission (milliseconds)

### If no delegation mechanism exists:
- Ship signal-only + paper leaderboard (already implemented)
- Document blocker in this file
- Revisit post-hackathon once Sodex releases official SDK

---

## Next Steps
- [ ] Email/Discord Sodex team asking for: (a) trading API docs with auth scheme, (b) whether `account_flow` mirror endpoint is public
- [ ] Check Sodex GitHub / Docs for any SDK, contract addresses, or ABI
- [ ] Confirm Sodex mainnet chain ID and RPC URL for ethers.js / viem connection
