/**
 * EIP-712 typed-data schemas for Sodex order delegation.
 * PLACEHOLDER — domain + contract address need confirmation from Sodex docs.
 * See docs/research/sodex-session-keys.md for research status.
 */

// TBD: confirm Sodex mainnet chain ID and verifyingContract
export const SODEX_DOMAIN = {
  name: 'SodexPerps',
  version: '1',
  chainId: null, // TODO: Sodex mainnet chain ID
  verifyingContract: null, // TODO: Sodex perps contract address
}

export const ORDER_PERMIT_TYPES = {
  OrderPermit: [
    { name: 'symbol',     type: 'string'  },
    { name: 'side',       type: 'string'  }, // 'long' | 'short'
    { name: 'maxSize',    type: 'uint256' }, // max notional in base units
    { name: 'maxPrice',   type: 'uint256' }, // max acceptable price (slippage guard)
    { name: 'expiry',     type: 'uint256' }, // unix ts, must be <= now + 300s
    { name: 'nonce',      type: 'uint256' }, // per-account nonce for replay protection
    { name: 'noWithdraw', type: 'bool'    }, // must always be true
  ],
}

/**
 * Build an OrderPermit value for signing.
 * Call wallet.signTypedData(SODEX_DOMAIN, ORDER_PERMIT_TYPES, buildPermit(...))
 */
export function buildPermit({ symbol, side, maxSize, maxPrice, nonce }) {
  const expiry = Math.floor(Date.now() / 1000) + 270 // 4.5 min — safe margin under 5 min max
  return {
    symbol,
    side,
    maxSize: BigInt(maxSize),
    maxPrice: BigInt(maxPrice),
    expiry: BigInt(expiry),
    nonce: BigInt(nonce),
    noWithdraw: true, // invariant — never change this
  }
}
