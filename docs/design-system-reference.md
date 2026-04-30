# Design System Reference — Northside Studio

> Frozen snapshot of all tokens and component patterns.
> Source of truth for applying the design language across all pages.

---

## Color Tokens

### Backgrounds
| Token | Value | Usage |
|---|---|---|
| `--ds-bg-0` | `#141414` | Page base |
| `--ds-bg-1` | `#1a1a1a` | App shell |
| `--ds-bg-2` | `#1f1f1f` | Sidebar / containers |
| `--ds-bg-3` | `#242424` | Cards / inner boxes |
| `--ds-bg-4` | `#2a2a2a` | Hover states |
| `--ds-bg-5` | `#2e2e2e` | Borders / active chips |

### Borders
| Token | Value | Usage |
|---|---|---|
| `--ds-border-subtle` | `#2a2a2a` | Lightest divider |
| `--ds-border-default` | `#333333` | Standard border |
| `--ds-border-strong` | `#3d3d3d` | Emphasized border |

### Text
| Token | Value | Usage |
|---|---|---|
| `--ds-text-primary` | `#f5f5f5` | Headings / values |
| `--ds-text-secondary` | `#a8a8a8` | Labels / subtitles |
| `--ds-text-tertiary` | `#777777` | Placeholders |
| `--ds-text-muted` | `#555555` | Disabled / hints |

### Accent (Orange)
| Token | Value | Usage |
|---|---|---|
| `--ds-accent` | `#f26b1f` | Primary action |
| `--ds-accent-hover` | `#ff7d33` | Hover state |
| `--ds-accent-dim` | `#c85614` | Pressed / dark |
| `--ds-accent-soft` | `rgba(242,107,31,0.15)` | Tinted fill |

### Semantic
| Token | Value | Usage |
|---|---|---|
| `--ds-success` | `#22c55e` | Completed / positive |
| `--ds-success-soft` | `rgba(34,197,94,0.12)` | Soft success fill |
| `--ds-warning` | `#f59e0b` | Pending / caution |
| `--ds-warning-soft` | `rgba(245,158,11,0.12)` | Soft warning fill |
| `--ds-danger-red` | `#ef4444` | Negative / error |
| `--ds-danger-red-soft` | `rgba(239,68,68,0.12)` | Soft danger fill |

### Chart Pixels
| Token | Value | Usage |
|---|---|---|
| `--ds-pixel-off` | `#252525` | Empty cell |
| `--ds-pixel-low` | `#ff8844` | Low fill |
| `--ds-pixel-high` | `#f26b1f` | Peak fill |

---

## Typography Scale

| Name | Size | Weight | Font | Sample |
|---|---|---|---|---|
| Display | 32px | 600 | JetBrains Mono | `12,847.39` |
| Heading | 24px | 600 | Inter | Dashboard Overview |
| Subheading | 18px | 600 | Inter | Revenue Breakdown |
| Body | 14px | 400 | Inter | Customer details and activity |
| Label | 13px | 500 | Inter | Total Revenue |
| Caption | 11px | 500 | Inter | LAST 30 DAYS |
| Mono Code | 12px | 400 | JetBrains Mono | TXN-00184-A |
| Tiny Label | 10px | 500 | Inter | JAN FEB MAR |

---

## Spacing Scale

| Token | Value |
|---|---|
| `--ds-s-1` | 4px |
| `--ds-s-2` | 8px |
| `--ds-s-3` | 12px |
| `--ds-s-4` | 16px |
| `--ds-s-5` | 20px |
| `--ds-s-6` | 24px |
| `--ds-s-8` | 32px |

---

## Border Radius Scale

| Token | Value | Label |
|---|---|---|
| `--ds-r-sm` | 6px | Small |
| `--ds-r-md` | 8px | Medium |
| `--ds-r-lg` | 12px | Large |
| `--ds-r-xl` | 16px | XL |

---

## Shadows

| Token | Value |
|---|---|
| `--ds-shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` |
| `--ds-shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` |

---

## Component Patterns

### KPI Cards — Double-box pattern
- Outer frame: `bg-1` (`#1a1a1a`)
- Inner card: `bg-3` (`#242424`) with inset shadow
- Footer always in the outer box
- Negative deltas: `--ds-danger-red`
- Sparkline bars: `--ds-accent` for peak

### Pixel / Mosaic Chart
- Stacked square cells per column
- Filled cells: `--ds-accent` (`#f26b1f`) for peak, `--ds-pixel-low` (`#ff8844`) for normal
- Empty cells: `--ds-pixel-off` (`#252525`)
- Column hover: highlight entire column

### Buttons
- **Primary**: `--ds-accent` background, white text
- **Secondary**: `--ds-bg-3` + `--ds-border-default`, `--ds-text-primary`
- **Ghost**: transparent + `--ds-text-secondary`
- Icon buttons: 32×32px, `--ds-bg-3` bg

### Status Pills
| Class | Color |
|---|---|
| `.success` | `--ds-success` with soft bg |
| `.pending` | `--ds-warning` with soft bg |
| `.refunded` | `--ds-danger-red` with soft bg |
| `.active` | `--ds-accent` with soft bg |
| `.vip` | Purple with soft bg |

### Form Controls
- Background: `--ds-bg-2`
- Border: `--ds-border-subtle`
- Radius: `--ds-r-md` (8px)
- Focus: `--ds-border-default`

### Sidebar Navigation
- Active item: `--ds-bg-3` background
- Hover: `--ds-accent` text color
- Sections separated by subtle dividers
- Brand logo: 32×32 with `--ds-accent` bg

### Topbar
- Sticky, `--ds-bg-1` background
- Search + icon boxes: `--ds-bg-2`, `--ds-border-subtle`, `--ds-r-md`
- Avatar box: 3px padding

### Tables
- Subtle header, same bg as rows
- No heavy borders — `--ds-border-subtle` only
- Row hover: `--ds-bg-4`
- Monospace font for IDs and amounts

### AI Insight Pill
- Neutral gray — never orange
- Sparkle icon `✦` + text + arrow circle
- Glows on hover with `--ds-accent-soft`

---

## Mapping: App vars → DS tokens

| App var | DS token | Value |
|---|---|---|
| `--color-primary` | `--ds-accent` | `#f26b1f` |
| `--color-primary-rgb` | — | `242, 107, 31` |
| `--color-bg-main` | `--ds-bg-0` | `#141414` |
| `--color-bg-secondary` | `--ds-bg-1` | `#1a1a1a` |
| `--color-bg-tertiary` | `--ds-bg-2` | `#1f1f1f` |
| `--color-bg-card` | `--ds-bg-3` | `rgba(36,36,36,0.6)` |
| `--color-text-main` | `--ds-text-primary` | `#f5f5f5` |
| `--color-text-secondary` | `--ds-text-secondary` | `#a8a8a8` |
| `--color-text-muted` | `--ds-text-muted` | `rgba(245,245,245,0.4)` |
| `--color-border-subtle` | `--ds-border-subtle` | `#2a2a2a` |
| `--color-border-visible` | `--ds-border-default` | `#333333` |
| `--color-border-strong` | `--ds-border-strong` | `#3d3d3d` |
| `--color-success` | `--ds-success` | `#22c55e` |
| `--color-error` | `--ds-danger-red` | `#ef4444` |
| `--color-warning` | `--ds-warning` | `#f59e0b` |
