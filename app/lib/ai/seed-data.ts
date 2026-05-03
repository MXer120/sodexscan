export const TOOL_SEED = [
  // ── Wallet / account ─────────────────────────────────────────────────────
  { id:"get_account_overview", namespace:"wallet",
    description:"Full wallet snapshot: equity, PnL rank, volume rank, cumulative PnL/volume, unrealized PnL, balance breakdown. Best first call for any wallet or account question.",
    example:'[TOOL:get_account_overview:{"address":"0x..."}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"}, fields:{type:"array"} }, required:["address"] } },

  { id:"get_balance", namespace:"wallet",
    description:"USD balance for a wallet. Returns spot, perps, evm, or total. Use when user asks about money, funds, or how much a wallet is worth.",
    example:'[TOOL:get_balance:{"address":"0x...","market":"total"}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"}, market:{type:"string",enum:["spot","perps","evm","total"]} }, required:["address"] } },

  { id:"get_balance_breakdown", namespace:"wallet",
    description:"Detailed USD breakdown by individual asset within spot, perps, evm, or all markets. Use when user wants to know what assets they hold or detailed allocation.",
    example:'[TOOL:get_balance_breakdown:{"address":"0x...","market":"total"}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"}, market:{type:"string",enum:["spot","perps","evm","total"]} }, required:["address"] } },

  { id:"get_open_positions", namespace:"wallet",
    description:"Live open perpetuals positions: symbol, side, size, entry/mark price, leverage, liquidation price, unrealized PnL. Use for current trades, open positions, active longs/shorts.",
    example:'[TOOL:get_open_positions:{"address":"0x..."}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"}, symbol:{type:"string"}, sort_by:{type:"string",enum:["notional","unrealized_pnl","leverage"]}, limit:{type:"number"} }, required:["address"] } },

  { id:"get_open_orders", namespace:"wallet",
    description:"Open limit orders for a wallet on perps and/or spot markets. Use when user asks about pending orders, open orders, or limit orders.",
    example:'[TOOL:get_open_orders:{"address":"0x...","market":"all"}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"}, market:{type:"string",enum:["perps","spot","all"]}, symbol:{type:"string"}, limit:{type:"number"} }, required:["address"] } },

  { id:"get_pnl_history", namespace:"wallet",
    description:"Historical PnL time series for a wallet by day/week/month. Use for performance over time, profit history, how well a trader has done.",
    example:'[TOOL:get_pnl_history:{"address":"0x...","view":"daily","days":30}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"}, view:{type:"string",enum:["daily","weekly","monthly"]}, days:{type:"number"} }, required:["address"] } },

  { id:"get_pnl_daily", namespace:"wallet",
    description:"Daily PnL series for a wallet for the last N days. Use for recent daily profit/loss chart data.",
    example:'[TOOL:get_pnl_daily:{"address":"0x...","days":30}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"}, days:{type:"number"} }, required:["address"] } },

  { id:"get_trades", namespace:"wallet",
    description:"Trade fill history: symbol, side, price, qty, fee, realized PnL. Use for recent trades, trading history, fills.",
    example:'[TOOL:get_trades:{"address":"0x...","market":"all","window":"7d"}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"}, market:{type:"string"}, symbol:{type:"string"}, window:{type:"string",enum:["24h","7d","30d","all"]}, max_items:{type:"number"} }, required:["address"] } },

  { id:"get_funding_history", namespace:"wallet",
    description:"Funding fee payment history for a wallet. Use when user asks about funding fees paid/received, funding events.",
    example:'[TOOL:get_funding_history:{"address":"0x...","window":"7d"}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"}, symbol:{type:"string"}, window:{type:"string"}, max_items:{type:"number"} }, required:["address"] } },

  { id:"get_funding_total", namespace:"wallet",
    description:"Total funding fees paid or received by a wallet, with optional per-symbol breakdown. Use for aggregate funding cost/income analysis.",
    example:'[TOOL:get_funding_total:{"address":"0x...","window":"30d","breakdown":true}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"}, window:{type:"string"}, symbol:{type:"string"}, breakdown:{type:"boolean"} }, required:["address"] } },

  { id:"get_performance_by_asset", namespace:"wallet",
    description:"Per-symbol trading performance: volume, PnL, win rate, trade count. Use when user wants to know which assets a wallet trades best or worst.",
    example:'[TOOL:get_performance_by_asset:{"address":"0x...","window":"30d"}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"}, market:{type:"string"}, window:{type:"string"}, limit:{type:"number"}, sort:{type:"string",enum:["total_pnl","volume","trades"]} }, required:["address"] } },

  { id:"get_rank", namespace:"wallet",
    description:"Leaderboard rank for a wallet by PnL and/or volume. Use when user asks about rank, standing, position on leaderboard.",
    example:'[TOOL:get_rank:{"address":"0x...","window":"all","sort":"both"}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"}, window:{type:"string",enum:["24h","7d","30d","all"]}, sort:{type:"string",enum:["pnl","volume","both"]} }, required:["address"] } },

  { id:"get_recent_activity", namespace:"wallet",
    description:"Merged activity feed: trades, transfers, and funding events sorted by time. Use for recent activity, what a wallet has been doing.",
    example:'[TOOL:get_recent_activity:{"address":"0x...","window":"7d"}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"}, types:{type:"array"}, window:{type:"string"}, limit:{type:"number"} }, required:["address"] } },

  { id:"get_transfers", namespace:"wallet",
    description:"Deposit and withdrawal history for a wallet. Use when user asks about deposits, withdrawals, bridge transactions, or fund movements.",
    example:'[TOOL:get_transfers:{"address":"0x...","type":"all","window":"30d"}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"}, type:{type:"string",enum:["all","deposit","withdrawal","internal"]}, window:{type:"string"}, max_items:{type:"number"} }, required:["address"] } },

  // ── EVM ────────────────────────────────────────────────────────────────────
  { id:"get_evm_holdings", namespace:"wallet",
    description:"SOSO-chain EVM holdings: native SOSO balance, vToken balances, staked sSOSO, LP vault positions. Use for on-chain token holdings.",
    example:'[TOOL:get_evm_holdings:{"address":"0x..."}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"} }, required:["address"] } },

  { id:"get_evm_transactions", namespace:"wallet",
    description:"EVM transaction history for a wallet on the SOSO chain via Blockscout. Use for on-chain transaction history.",
    example:'[TOOL:get_evm_transactions:{"address":"0x...","limit":20}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"}, limit:{type:"number"} }, required:["address"] } },

  { id:"get_evm_token_transfers", namespace:"wallet",
    description:"ERC-20 token transfer history on the SOSO chain. Use when user asks about token transfers, sent/received tokens.",
    example:'[TOOL:get_evm_token_transfers:{"address":"0x...","limit":20}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"}, limit:{type:"number"} }, required:["address"] } },

  // ── Market ─────────────────────────────────────────────────────────────────
  { id:"get_leaderboard", namespace:"market",
    description:"Top traders on Sodex leaderboard by PnL or volume. Use when user asks for top wallets, best traders, who is winning.",
    example:'[TOOL:get_leaderboard:{"sort":"pnl","limit":10}]',
    schema_def:{ type:"object", properties:{ sort:{type:"string",enum:["pnl","volume"]}, limit:{type:"number"}, offset:{type:"number"} } } },

  { id:"get_prices", namespace:"market",
    description:"Live mark prices for Sodex perps and spot vTokens (vBTC, vETH, vSOL, vTSLA, vNVDA, vGOOGL, vXAUt, SOSO, etc.). Use when user asks about current prices.",
    example:'[TOOL:get_prices:{"symbols":["BTC","ETH"]}]',
    schema_def:{ type:"object", properties:{ symbols:{type:"array",items:{type:"string"}} } } },

  { id:"get_symbols", namespace:"market",
    description:"List all available trading symbols on Sodex with current prices. Use when user asks what assets are available to trade.",
    example:'[TOOL:get_symbols:{}]',
    schema_def:{ type:"object", properties:{} } },

  { id:"get_incoming_listings", namespace:"market",
    description:"Upcoming symbol listings on Sodex futures or spot markets. Use when user asks about new listings, upcoming tokens, what is coming soon.",
    example:'[TOOL:get_incoming_listings:{"market":"futures"}]',
    schema_def:{ type:"object", properties:{ market:{type:"string",enum:["spot","futures"]} } } },

  // ── Referral ───────────────────────────────────────────────────────────────
  { id:"resolve_refcode", namespace:"referral",
    description:"Resolve a referral code or invite code to the inviter's wallet address. Use when user mentions a ref code, referral code, or invite code. Chain with other tools.",
    example:'[TOOL:resolve_refcode:{"code":"SOSO"}]',
    schema_def:{ type:"object", properties:{ code:{type:"string"} }, required:["code"] } },

  // ── Wallet meta (auth required) ───────────────────────────────────────────
  { id:"get_alias", namespace:"meta",
    description:"Get the alias tag, group name, and group color set for a wallet address by the current user.",
    example:'[TOOL:get_alias:{"address":"0x..."}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"} }, required:["address"] } },

  // ── User actions (auth required) ──────────────────────────────────────────
  { id:"list_alerts", namespace:"user",
    description:"List all price alerts configured by the current user. Use when user asks to see their alerts, alert settings, or notifications.",
    example:'[TOOL:list_alerts:{}]',
    schema_def:{ type:"object", properties:{} } },

  { id:"watchlist_add", namespace:"user",
    description:"Add a wallet address to the current user's watchlist.",
    example:'[TOOL:watchlist_add:{"address":"0x..."}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"} }, required:["address"] } },

  { id:"watchlist_remove", namespace:"user",
    description:"Remove a wallet address from the current user's watchlist.",
    example:'[TOOL:watchlist_remove:{"address":"0x..."}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"} }, required:["address"] } },

  { id:"alias_set", namespace:"user",
    description:"Set or update a custom name tag (alias) for a wallet address for the current user.",
    example:'[TOOL:alias_set:{"address":"0x...","name":"My Whale"}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"}, name:{type:"string"} }, required:["address","name"] } },

  { id:"alias_delete", namespace:"user",
    description:"Delete the alias tag for a wallet address for the current user.",
    example:'[TOOL:alias_delete:{"address":"0x..."}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"} }, required:["address"] } },

  { id:"group_create", namespace:"user",
    description:"Create a wallet group with a name and optional color for organizing wallets.",
    example:'[TOOL:group_create:{"name":"My Whales","color":"#ff6600"}]',
    schema_def:{ type:"object", properties:{ name:{type:"string"}, color:{type:"string"} }, required:["name"] } },

  { id:"group_assign", namespace:"user",
    description:"Assign a wallet address to a named group, or remove it from any group by omitting group_name.",
    example:'[TOOL:group_assign:{"address":"0x...","group_name":"My Whales"}]',
    schema_def:{ type:"object", properties:{ address:{type:"string"}, group_name:{type:"string"} }, required:["address"] } },

  { id:"alert_create", namespace:"user",
    description:"Create a price alert for a token or wallet. Triggers when price crosses threshold. Supports expiry and max trigger limits.",
    example:'[TOOL:alert_create:{"type":"price_above","target":"BTC","thresholds":{"value":100000}}]',
    schema_def:{ type:"object", properties:{ type:{type:"string"}, target:{type:"string"}, thresholds:{type:"object"}, label:{type:"string"}, market:{type:"string"}, max_triggers:{type:"number"}, active_for:{type:"string"} }, required:["type","target"] } },

  { id:"alert_update", namespace:"user",
    description:"Update an existing price alert by ID. Can change thresholds, label, market, expiry, or enable/disable state.",
    example:'[TOOL:alert_update:{"id":"abc","enabled":false}]',
    schema_def:{ type:"object", properties:{ id:{type:"string"}, label:{type:"string"}, enabled:{type:"boolean"}, thresholds:{type:"object"} }, required:["id"] } },

  { id:"alert_delete", namespace:"user",
    description:"Delete a price alert by ID.",
    example:'[TOOL:alert_delete:{"id":"abc"}]',
    schema_def:{ type:"object", properties:{ id:{type:"string"} }, required:["id"] } },

  { id:"alert_toggle", namespace:"user",
    description:"Enable or disable a price alert by ID.",
    example:'[TOOL:alert_toggle:{"id":"abc","enabled":true}]',
    schema_def:{ type:"object", properties:{ id:{type:"string"}, enabled:{type:"boolean"} }, required:["id","enabled"] } },
];

export const KB_SEED = [
  { source_id:"sodex-overview", doc_type:"doc", title:"What is Sodex?",
    content:"Sodex is an on-chain perpetuals and spot DEX on SOSO chain (EVM-compatible, chainId 7890). Supports up to 20× leverage, cross and isolated margin, hourly funding rates.",
    tags:["sodex","overview","perps","spot"] },
  { source_id:"sodex-vtokens", doc_type:"doc", title:"vTokens and Spot Trading",
    content:"Spot trading uses vTokens (oracle-priced synthetics) traded against vUSDT: vBTC, vETH, vSOL, vTSLA, vNVDA, vGOOGL, vXAUt, vsMAG7.ssi, vsMAG7.SLP.",
    tags:["vtokens","spot","synthetic"] },
  { source_id:"sodex-soso-token", doc_type:"doc", title:"SOSO Token and Staking",
    content:"SOSO is the native chain token. Stake SOSO → receive sSOSO, which earns protocol revenue. Used for gas on the SOSO chain.",
    tags:["soso","staking","token"] },
  { source_id:"sodex-deposits", doc_type:"faq", title:"How to deposit to Sodex",
    content:"Bridge USDC/USDT from Ethereum or Arbitrum via bridge.sodex.io. Funds arrive as vUSDT in spot wallet. Takes 5–15 minutes. If stuck >30 min, check origin-chain gas and bridge status.",
    tags:["deposit","bridge","usdc"] },
  { source_id:"sodex-withdraw", doc_type:"faq", title:"How to withdraw from Sodex",
    content:"Reverse the bridge at bridge.sodex.io. Move vUSDT back to USDC/USDT on ETH/ARB. Same 5–15 min window. Need SOSO for gas.",
    tags:["withdraw","bridge"] },
  { source_id:"sodex-perps", doc_type:"doc", title:"Perpetuals Trading",
    content:"Up to 20× leverage, cross-margin (shared collateral) or isolated-margin (per-position). Funding hourly: positive = longs pay shorts. Liquidation when margin < maintenance — use stop-losses.",
    tags:["perps","leverage","funding","liquidation"] },
  { source_id:"sodex-leaderboard", doc_type:"doc", title:"Leaderboard and Ranks",
    content:"Ranks traders by cumulative PnL or volume. Windows: 24h, 7d, 30d, all-time. Copy trading mirrors a leaderboard wallet's positions automatically.",
    tags:["leaderboard","rank","pnl","copy-trade"] },
  { source_id:"sodex-funding", doc_type:"doc", title:"Funding Rates Explained",
    content:"Hourly payments between perp holders. Positive: longs pay shorts (bullish market). Negative: shorts pay longs. Keeps perp price near oracle. High positive = crowded longs.",
    tags:["funding","rates","perps"] },
  { source_id:"sodex-wallet-setup", doc_type:"faq", title:"Wallet setup for Sodex",
    content:"Use any EVM wallet (MetaMask, Rabby) with SOSO chain (chainId 7890). Add chain from Sodex website. Need SOSO for gas. Bridge USDC/USDT to start.",
    tags:["wallet","metamask","setup"] },
  { source_id:"sodex-copy-trade", doc_type:"doc", title:"Copy Trading",
    content:"Mirror a leaderboard wallet's perp positions in real time. Set copy ratio and max position size. Stop anytime.",
    tags:["copy-trade","leaderboard"] },
];
