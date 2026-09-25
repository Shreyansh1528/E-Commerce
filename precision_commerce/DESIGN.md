---
name: Precision Commerce
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#3130c0'
  on-tertiary: '#ffffff'
  tertiary-container: '#4b4dd8'
  on-tertiary-container: '#d9d8ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-sm: 0.75rem
  gutter-lg: 1.5rem
  margin: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

The design system projects unwavering operational reliability, mathematical precision, and high-velocity clarity. Built for modern D2C founders, supply chain managers, and e-commerce operators, the UI balances dense operational control panels with generous visual breathing room. 

The aesthetic is Modern Enterprise SaaS—merging the disciplined structure of modern developer tooling with the frictionless usability of contemporary commerce software. It rejects ornamental trends in favor of refined utility: sub-pixel borders, structural grid geometry, strict typographic hierarchy, and deliberate semantic color accents. High-frequency workflows remain calm and legible over hours of continuous use.

## Colors

The palette establishes an authoritative, high-contrast operational environment anchored by slate neutrals and vibrant functional indicators.

### Core Roles
- **Primary (`#4F46E5` / `#6366F1`)**: Indigo/Violet accent deployed exclusively for key conversion paths, active states, selected table rows, and primary calls to action.
- **Secondary (`#0F172A`)**: Deep Navy Slate for dominant display type, high-contrast badges, and primary navigational scaffolding.
- **Neutral Canvas**: Surface light scale builds on `#F8FAFC` (Canvas), `#FFFFFF` (Surface Elevated), and `#E2E8F0` (Hairline Structure). Dark scale translates to `#090D16` (Canvas), `#0F172A` (Surface), and `#1E293B` (Hairline Structure).

### Semantic & Operational Accents
Color delivers functional intelligence, never decoration:
- **Success / Healthy (`#10B981`)**: Order fulfillment, positive margins, healthy stock levels.
- **Warning / Low Stock (`#F59E0B`)**: Depleting inventory, pending verification, capture delays.
- **Danger / Critical (`#EF4444`)**: Chargebacks, failed webhooks, canceled shipments, refunds.
- **Info / In Transit (`#0284C7`)**: Shipments in transit, queued background syncs.
- **Tier / VIP (`#8B5CF6`)**: High-LTV customer segmentation, wholesale tiers.

## Typography

Typographic scale is strictly paired with utility. **Plus Jakarta Sans** brings structured, humanized confidence to high-level page titles, dashboard metrics, and modal headers. **Inter** handles high-density tables, multi-column inputs, operational alerts, and navigation.

All monetary amounts, SKU identifiers, order numbers, and tracking IDs must activate tabular lining numbers (`font-feature-settings: "tnum" 1, "cv05" 1`) to preserve column alignment and rapid vertical scanning across operational data grids.

## Layout & Spacing

The layout model uses a multi-tier responsive shell designed around a fixed collapsible sidebar (width: 240px desktop, 64px collapsed icon-rail) and a fluid, 12-column content matrix with max-width bounding (`1600px` ultra-wide lock).

### Form Factors & Adaptation
- **Desktop (≥ 1280px)**: 12-column grid, `1.5rem` gutters, multi-pane split sheets (e.g., inventory ledger left, order detail inspector right).
- **Tablet (768px – 1279px)**: 8-column layout, `1.25rem` gutters, inspector panes convert into sliding overlay sheets; sidebar defaults to icon-rail.
- **Mobile (< 768px)**: Single column stack, `0.75rem` internal gutters, horizontal overflow table segments convert to sticky-first-column data cards with swipe interactions.

Spacing relies on a rigid 4px base increment. Inner-cell paddings are locked to vertical compact intervals (`space-sm`) and horizontal breathing intervals (`space-md`) to ensure dense, single-viewport data oversight.

## Elevation & Depth

Visual hierarchy avoids heavy drop-shadows, using low-contrast outlines coupled with tight, directional micro-shadows.

1. **Base Surface (Flat)**: Background `#F8FAFC` directly carries hairline borders (`1px solid #E2E8F0`).
2. **Layer 1 (Cards, Data Grids, Toolbar modules)**: `#FFFFFF` background with `box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.05)`, bounded by `#E2E8F0`.
3. **Layer 2 (Dropdowns, Popovers, Filter flyouts)**: Elevated white surface with dual-tone shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`, bordered by `#CBD5E1`.
4. **Layer 3 (Modals, Slide-over drawers)**: High-level overlay with `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)`, framed by a subtle backdrop blur (`backdrop-filter: blur(4px)`) over `#0F172A` at 40% opacity.

## Shapes

The geometry uses restrained, calibrated corner rounding. A base radius of `6px` (`roundedness: 1`) governs buttons, text inputs, table headers, and internal badges, producing a crisp, technical feel. 

Large container panels, modular dashboard widgets, and contextual dialogue overlays scale to `8px` (`rounded-lg`) or `10px` (`rounded-xl`). Status indicator pips and count tags maintain complete circular capsules (`rounded-full`), balancing the surrounding structural geometry.

## Components

### Buttons
- **Primary**: Solid `#4F46E5` fill, `#FFFFFF` text, subtle inset highlight `inset 0 1px 0 rgba(255, 255, 255, 0.15)`, `6px` radius. Hover: `#4338CA`. Active: `#3730A3`.
- **Secondary / Outlined**: `#FFFFFF` background, `#0F172A` text, `1px solid #E2E8F0`, micro-shadow. Hover: `#F8FAFC` and border `#CBD5E1`.
- **Destructive**: Tinted surface (`#FEF2F2`), `#DC2626` text, hairline border `#FCA5A5`. Active states shift to solid `#DC2626` fill with white text.
- **Sizes**: Standard desktop compact controls operate at `32px` height; modal actions and conversions scale to `36px` height.

### Input Fields & Selects
- Background `#FFFFFF`, border `1px solid #CBD5E1`, `6px` radius, font size `14px` with a default height of `34px`.
- Hover: Border shifts to `#94A3B8`.
- Focus: Zero layout shift; ring transitions to `2px solid rgba(79, 70, 229, 0.2)` with an indigo hairline border `#4F46E5`.
- Monospace SKU/Numeric inputs feature right-aligned tabular numbers.

### Badges & Status Chips
- Height `20px`, padding `0 6px`, `4px` radius, typography `label-sm` (uppercase, tracked).
- Composed of low-opacity tint backgrounds paired with high-contrast text:
  - **Healthy / Delivered**: `#ECFDF5` background, `#065F46` text, dot pip `#10B981`.
  - **Low Stock / Warning**: `#FFFBEB` background, `#92400E` text, dot pip `#F59E0B`.
  - **Failed / Refunded**: `#FEF2F2` background, `#991B1B` text, dot pip `#EF4444`.
  - **VIP**: `#F5F3FF` background, `#5B21B6` text, star/crown marker.

### Checkboxes & Switches
- **Checkboxes**: `16px × 16px`, `4px` radius. Unchecked: `1px solid #CBD5E1`, `#FFFFFF` base. Checked: `#4F46E5` with `#FFFFFF` check vector.
- **Switches**: `32px × 18px` track with a `14px` white thumb, running smooth ease-in-out translation.

### Cards & Data Tables
- **Cards**: Flat white surface, surrounded by `1px solid #E2E8F0`, with card headers set apart by a bottom divider and padding `12px 16px`.
- **Data Tables**: Striped hover states (`#F8FAFC`). Column headers styled in `11px` bold uppercase (`#64748B`), with sorting chevrons. Numeric and price data must be right-aligned with tabular numerals.

### Metrics KPI Tile
- Surface white with inset border. Value formatted in `headline-lg` (`Plus Jakarta Sans`), right-flanked by inline percentage delta pills showing trend vectors (emerald arrow up for gain, crimson arrow down for drop).