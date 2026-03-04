

# Icon System Standardization — Production-Ready

## Audit Result
All icons already come from `lucide-react`. No migration needed. The work is purely **consistency and polish**.

## Changes

### 1. Create `src/components/ui/Icon.tsx`
Centralized wrapper enforcing:
- Size presets: `sidebar` (20px), `header` (18px), `button` (16px), `table` (16px), `decorative` (20px)
- Default `strokeWidth: 1.8` (thinner, more premium than default 2)
- Optional `interactive` prop adding subtle `hover:scale-105` with 150ms transition

### 2. Global CSS in `src/index.css`
- `.lucide { stroke-width: 1.8; }` — standardizes every Lucide icon project-wide in one line
- `.icon-interactive` utility class for hover scale effect on interactive elements

### 3. `DashboardHeader.tsx` — Standardize header icon sizes
- All header action icons: `h-[18px] w-[18px]` (was mixed `h-4 w-4` / `h-3.5 w-3.5`)
- Add `icon-interactive` to clickable icon buttons (copy, mask toggle)
- Dropdown menu icons stay `h-4 w-4` (standard for menu items)

### 4. `DashboardSidebar.tsx` — Add hover animation
- Add `icon-interactive` class to nav link icon wrappers
- Sizes already correct (`h-5 w-5`)

### 5. `MobileBottomNav.tsx` — Standardize mobile
- Mobile nav icons: `h-5 w-5` (was `h-[22px] w-[22px]`, slightly oversized)
- Drawer menu icons already `h-5 w-5` — correct

### 6. `Dashboard.tsx` — Polish CTA icons
- CTA button icons: consistent `h-4 w-4` (already correct)
- Stat card icons: add `strokeWidth` via global CSS (automatic)

## Files

| File | Action |
|---|---|
| `src/components/ui/Icon.tsx` | **Create** — centralized component |
| `src/index.css` | Add 2 utility rules |
| `src/components/dashboard/DashboardHeader.tsx` | Standardize sizes to 18px, add interactive class |
| `src/components/dashboard/DashboardSidebar.tsx` | Add interactive class to nav icons |
| `src/components/dashboard/MobileBottomNav.tsx` | Fix icon sizes to 20px |
| `src/pages/Dashboard.tsx` | No changes needed (already consistent) |

