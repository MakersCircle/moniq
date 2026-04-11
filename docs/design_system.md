# Design System

## 1. Aesthetic Philosophy
**moniq** must feel like a premium, native command center rather than a generic startup website. 
- **Glassmorphism & Depth:** Soft shadows and translucent panels over rich animated gradient backgrounds.
- **Micro-interactions:** Buttons and cards must respond instantly with subtle scaling (`scale-95`) and varied opacities upon interaction.
- **Dark Mode First:** Deep slate arrays, vibrant accents, minimizing eye strain. High contrast for numbers.

## 2. Color Palette (Dark Theme Variant)

### Foundations
- **Background:** Rich Dark (e.g., `#09090b` or very dark indigo/slate `slate-950`).
- **Surface/Cards:** Slightly lighter with translucency (`rgba(255, 255, 255, 0.03)` with `backdrop-blur-md`).
- **Borders:** Low opacity whites (`rgba(255, 255, 255, 0.1)`).

### Accents
- **Primary:** Vibrant Jade or Indigo, used for active states and primary buttons.
- **Income (Positive):** Emerald Green (`#10b981`).
- **Expense (Negative):** Rose Red (`#f43f5e`).
- **Transfer (Neutral):** Blue or Amber.

### Text Colors
- **Primary Text:** High contrast white/off-white (`#f8fafc`).
- **Secondary Text:** Muted slate (`#94a3b8`).

## 3. Typography
**Primary Font:** `Inter` or `Geist` (clean geometric sans-serif).
**Numbers Font:** A monospaced or highly legible programmatic font for amounts (e.g., `JetBrains Mono` or `Roboto Mono`).

- **H1 (Dashboards):** 32px, bold, tight tracking.
- **H2 (Card Titles):** 20px, semi-bold.
- **BodyText:** 14-16px, regular.
- **Mini-labels:** 12px, uppercase, 500 weight, widened tracking for data labels.

## 4. UI Components

### Cards & Surfaces
- `border-radius: 16px` or `24px` for major containers.
- Subtle inner borders (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.1)`).

### Data Input (Forms)
- Input backgrounds: Transparent dark (`bg-white/5`).
- No hard borders until focused, focus rings inherit primary accent color.
- Dropdowns must utilize full screen or bottom-sheet modalities on mobile devices.

### Buttons
- Primary: Solid background, subtle gradient overlay, full width on mobile.
- Secondary: Glassmorphic, light border, hover effect.

## 5. Animations & Transitions
- Non-distracting, pure CSS transitions for hovers (`transition: all 0.2s ease`).
- Background gradients should utilize slow, GPU-accelerated CSS keyframe translations to avoid static lifelessness.
