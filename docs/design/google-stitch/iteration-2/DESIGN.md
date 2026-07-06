---
name: PocketFlow
colors:
  surface: '#FFFFFF'
  surface-dim: '#dfd9d2'
  surface-bright: '#fff8f2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f9f2ec'
  surface-container: '#f4ede6'
  surface-container-high: '#eee7e0'
  surface-container-highest: '#e8e1db'
  on-surface: '#1e1b17'
  on-surface-variant: '#434655'
  inverse-surface: '#33302c'
  inverse-on-surface: '#f6f0e9'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#9d4300'
  on-secondary: '#ffffff'
  secondary-container: '#fd761a'
  on-secondary-container: '#5c2400'
  tertiary: '#006329'
  on-tertiary: '#ffffff'
  tertiary-container: '#007f36'
  on-tertiary-container: '#c7ffca'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb690'
  on-secondary-fixed: '#341100'
  on-secondary-fixed-variant: '#783200'
  tertiary-fixed: '#7ffc97'
  tertiary-fixed-dim: '#62df7d'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005320'
  background: '#fff8f2'
  on-background: '#1e1b17'
  surface-variant: '#e8e1db'
  aman-success: '#16A34A'
  waspada-warning: '#F59E0B'
  bahaya-danger: '#DC2626'
  info-blue: '#0EA5E9'
  text-primary: '#1F2937'
  text-secondary: '#6B7280'
  primary-soft: '#DBEAFE'
  success-soft: '#DCFCE7'
  warning-soft: '#FEF3C7'
  danger-soft: '#FEE2E2'
typography:
  headline-lg:
    fontFamily: Nunito Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.03em
  headline-md:
    fontFamily: Nunito Sans
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Nunito Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  amount-lg:
    fontFamily: Nunito Sans
    fontSize: 36px
    fontWeight: '900'
    lineHeight: 44px
    letterSpacing: -0.04em
  amount-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '800'
    lineHeight: 28px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.02em
  headline-lg-mobile:
    fontFamily: Nunito Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 34px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 40px
  safe-margin: 16px
  gutter: 12px
---

## Brand & Style

The design system is built on a **Playful & Practical** philosophy, specifically tailored for a mobile-first personal finance experience. It moves away from the sterile, intimidating nature of traditional banking apps toward a "pocket-based" mental model that feels personal, approachable, and encouraging.

The visual style is a hybrid of **Minimalism** and **Tactile Modernism**. It utilizes heavy whitespace and a soft, warm base palette to reduce "financial anxiety," while employing large rounded corners (up to 32px) and subtle depth to make UI elements—specifically "Pockets"—feel like physical, touchable containers. 

### Key Attributes:
- **Friendly & Energetic:** Using vibrant primary blues and energetic accent oranges against a calm cream backdrop.
- **Mobile-Native:** Prioritizing thumb-zone interactions with bottom navigation and sticky actions.
- **Conversational:** The UI copy uses friendly Indonesian (e.g., "Aman per hari") to make money management feel like a supportive dialogue rather than a ledger.
- **Status-Driven:** Visual cues are tied directly to financial health (Aman, Waspada, Bahaya), ensuring immediate cognitive recognition of budget status.

## Colors

The color palette is anchored by a warm cream background (`#FFF8F1`) which provides a "paper-like" softness, distinguishing it from cold, corporate white-label apps.

- **Primary Blue:** Used for core actions, branding, and active navigation states.
- **Secondary Orange:** Reserved for playful highlights, quick-add chips, and secondary calls to action.
- **Semantic Status:** A strict traffic-light system is used for financial health:
    - **Aman (Green):** Financials are within budget.
    - **Waspada (Yellow):** Budget is nearing its limit.
    - **Bahaya/Overbudget (Red):** Immediate attention required.
- **Surface:** Pure white (`#FFFFFF`) is used for cards and elevated containers to pop against the cream background.

## Typography

The system uses a pairing of **Nunito Sans** for expressive, rounded headlines and **Inter** for highly legible, functional body text and numerical data.

- **Amount Styles:** Financial figures are treated as first-class citizens. `amount-lg` and `amount-md` use heavier weights and tighter letter spacing to create a distinct visual "stamp" of importance.
- **Hierarchy:** Headlines are bold and tightly spaced to maintain a modern, "app-centric" feel rather than a document feel.
- **Copy:** All microcopy should be in Indonesian, maintaining a short, conversational tone (e.g., using "Food mulai ngebut 🍜" for spending alerts).

## Layout & Spacing

This is a **mobile-first, fluid layout** designed primarily for PWA usage on smartphone screens. 

- **Grid Model:** A 4-column fluid grid is used for mobile, with a standard **16px (lg)** outer margin to ensure content doesn't hit the screen edges.
- **Vertical Rhythm:** Content blocks (cards) should use **24px (xl)** vertical spacing to maintain a light, airy feel. Smaller elements within cards use **8px (sm)** or **12px (md)** spacing.
- **The "Thumb Zone":** All primary actions, such as the "Add" button and navigation, are placed in the bottom 30% of the screen.
- **Breakpoints:** For larger mobile devices or tablets, the layout remains centered with a max-width of 480px to preserve the intimate "handheld" experience.

## Elevation & Depth

Visual hierarchy is achieved through a combination of **Tonal Layers** and **Ambient Shadows**.

1.  **Level 0 (Background):** The warm cream (`#FFF8F1`) base.
2.  **Level 1 (Cards):** White surfaces (`#FFFFFF`) with a very soft, diffused shadow (10% opacity primary blue tint) to simulate a "pocket" sitting on a surface.
3.  **Level 2 (Active/Interactive):** Elements like the active Pocket Card or the Bottom Navigation use a slightly stronger shadow or a 1px border (`#E5E7EB`) to indicate interactivity.
4.  **Level 3 (Overlay/Modals):** Bottom sheets used for transaction input use a background blur (backdrop-filter) and a high-radius shadow to focus user attention.

Avoid harsh black shadows; always tint shadows with the primary blue or the background cream to maintain the soft brand personality.

## Shapes

The shape language is defined by extreme roundedness to evoke a friendly, "squishy" tactile feel. 

- **Standard Cards:** Use **24px (rounded-lg)** for general content.
- **Pocket Cards:** As the central metaphor, these use the maximum **32px (rounded-xl)** to feel like distinct, friendly containers.
- **Interactive Elements:** Buttons and status chips use **Pill-shaped (999px)** roundedness to clearly communicate tap-ability.
- **Inputs:** Use **18px (rounded-md)** to balance readability with the overall rounded aesthetic.

## Components

### Pocket Cards
The core visual metaphor. Each card must include:
- A top-right emoji or icon badge.
- A clear balance in `amount-md`.
- A status pill (Aman/Waspada/Bahaya) using the semantic color palette.
- A progress bar (height 8px) showing budget usage.

### Buttons
- **Primary:** Full-width, pill-shaped, using Primary Blue with white text. High-visibility for "Save" or "Transfer".
- **Secondary:** Pill-shaped with `primary-soft` background and `primary` blue text. Used for "Cancel" or "Edit".
- **Quick-Add Chips:** Small orange-accented pill buttons for rapid amount entry (e.g., +Rp10k).

### Transaction Inputs
- **Amount Input:** Extremely large, centered text (`amount-lg`) with no border, just a subtle bottom divider.
- **Toggle Switches:** Used for "Expense" vs "Transfer". 
    - **Expense style:** Uses Primary Blue.
    - **Transfer style:** Uses a directional visual (Icon: Pocket A → Pocket B) to distinguish from spending.

### Bottom Navigation
- Fixed 5-item bar.
- The center item ("Add") is elevated or visually distinct with a Primary Blue background and a white plus icon.
- Labels are mandatory (don't rely on icons alone).

### Empty States
Use "🌱" or other soft emojis with conversational copy like "Belum ada transaksi hari ini." to keep the mood light.