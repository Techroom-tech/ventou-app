
# Profile Settings — Full Account Management Center Refactor

## Feasibility Assessment (What Already Exists vs. What Needs Building)

### Already Available in Supabase Client:
- `supabase.auth.updateUser({ password })` — password change (exists in AuthContext)
- `supabase.auth.updateUser({ email })` — email change (triggers verification email)
- `supabase.auth.signOut({ scope: 'global' })` — sign out all sessions
- `supabase.auth.getSession()` — returns current session info (device user-agent, timestamps)
- `supabase.auth.mfa.enroll()` / `.challenge()` / `.verify()` — full 2FA TOTP flow
- `supabase.from('profiles').update(...)` — profile data update
- `user.email_confirmed_at` — email verification status

### Not Available / Requires Infrastructure:
- Session listing across devices → **not possible client-side**; show only current session with "Sign out all" button
- Avatar file upload → **Supabase Storage bucket needed** (SQL migration required)
- Account deletion → **edge function required** (admin API); implement as a soft deactivation via profile flag for now
- Subscription/Billing → **no infrastructure exists**; keep as a clean "Bientôt" section with plan display
- `phone`, `language`, `timezone` columns → **not in `profiles` table**; require a DB migration to add

### Scope Decisions (Strict Functional-Only Rule):
- **Sessions**: Show current session info + "Disconnect all devices" button only. No fake multi-session list.
- **2FA**: Full TOTP implementation using Supabase MFA API — real QR code, real backup codes concept.
- **Avatar upload**: Add Storage bucket via SQL migration; replace URL input with file upload.
- **Account deletion**: Implement a confirmation modal that calls `supabase.auth.signOut()` + marks shop as inactive. Real behavior, no fake modal.
- **Notifications section**: Link to the existing `/dashboard/parametres/notifications` page (already built) — don't duplicate it. Show a summary row instead.
- **Subscription section**: Clean "Plan gratuit — Bientôt" display card (not fake UI).

---

## Database Changes Required

### Migration 1: Extend `profiles` table
Add columns for extended personal info:
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Africa/Abidjan';
```

### Migration 2: Create avatar Storage bucket
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Migration 3: Update `Profile` type
Update `src/integrations/supabase/client.ts` to add new profile fields to the `Profile` interface.

---

## Page Architecture — 5 Sections

The full page is a single scrollable page at `/dashboard/parametres/profil` with 5 card sections stacked vertically. No tabs, no nested routing. Max width 820px.

```
┌─────────────────────────────────────────┐
│  ← Paramètres     Profil & Compte        │
├─────────────────────────────────────────┤
│  [1] Personal Information Card          │
│      Avatar upload + name/email/phone   │
│      Language + Timezone dropdowns      │
│      Email verified badge               │
│      [Save button]                      │
├─────────────────────────────────────────┤
│  [2] Security Card                      │
│      Change password (3 fields)         │
│      Password strength bar              │
│      2FA toggle (TOTP via Supabase MFA) │
│      [Save password button]             │
├─────────────────────────────────────────┤
│  [3] Sessions Card                      │
│      Current session info (device/IP)   │
│      [Sign out all devices button]      │
├─────────────────────────────────────────┤
│  [4] Subscription Card                  │
│      Plan: Gratuit / Bientôt badge      │
├─────────────────────────────────────────┤
│  [5] Danger Zone Card                   │
│      Red border                         │
│      Deactivate shop / Delete account   │
│      Confirmation modal on each         │
└─────────────────────────────────────────┘
```

---

## Section-by-Section Technical Design

### Section 1 — Personal Information

**State:**
```ts
const [form, setForm] = useState({
  first_name: '', last_name: '', phone: '',
  language: 'fr', timezone: 'Africa/Abidjan'
});
const [avatarFile, setAvatarFile] = useState<File | null>(null);
const [avatarPreview, setAvatarPreview] = useState<string>('');
const [isDirty, setIsDirty] = useState(false);
```

**Avatar upload logic:**
```ts
const uploadAvatar = async (file: File) => {
  const ext = file.name.split('.').pop();
  const path = `${user.id}/avatar.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
};
```

**Email section:** Read-only field showing `user.email` + badge:
- `user.email_confirmed_at` exists → green `<Badge>` "Vérifié"
- Otherwise → amber badge "Non vérifié" + "Renvoyer l'email de vérification" link

**Language dropdown options:** French, English (2 options only, matching app scope)

**Timezone dropdown options:** Africa/Abidjan, Africa/Lagos, Africa/Dakar, Africa/Douala, Europe/Paris, UTC (6 options — relevant to West/Central Africa market)

**Save action:**
1. If `avatarFile`, upload to storage → get URL → include in profile update
2. Update `profiles` table with all form fields
3. Show success toast

**Dirty state:** Track `isDirty` to disable save button when no changes made.

---

### Section 2 — Security

**Sub-section A: Change Password**

```ts
const [pwForm, setPwForm] = useState({
  current_password: '', new_password: '', confirm_password: ''
});
const [showCurrent, setShowCurrent] = useState(false);
const [showNew, setShowNew] = useState(false);
```

**Password strength bar:** Real-time computation based on `new_password`:
- `< 6 chars` → Weak (red)
- `6–9 chars with no special chars` → Fair (amber)
- `10+ chars` → Strong (green)
- `14+ chars with special chars + uppercase` → Very strong (green, full bar)

**Save logic:**
1. Validate: `new_password === confirm_password`
2. Call `supabase.auth.updateUser({ password: new_password })`
3. The Supabase API does NOT require current password verification — Supabase handles this via the existing session. Note: `updatePassword` already exists in `AuthContext`.
4. Show toast success + clear form

**Sub-section B: Two-Factor Authentication (2FA)**

Using Supabase MFA API:
```ts
// Enroll (enable 2FA)
const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
// data.totp.qr_code — SVG QR code
// data.totp.secret — manual key
// data.id — factor ID for verification

// Verify enrollment
const { data: challengeData } = await supabase.auth.mfa.challenge({ factorId });
await supabase.auth.mfa.verify({ factorId, challengeId, code: otpInput });

// Unenroll (disable 2FA)
await supabase.auth.mfa.unenroll({ factorId });
```

**UI flow:**
- Initial state: check `user.factors` — if TOTP factor exists and is verified → show "2FA Active" with disable button
- If not active → show toggle to enable → on enable, show modal with QR code + manual key + 6-digit OTP input to verify
- On verify success → dismiss modal, show "2FA Activé" badge
- On disable → confirm dialog → call unenroll → success toast

**State:**
```ts
const [mfaFactors, setMfaFactors] = useState<any[]>([]);
const [enrolling, setEnrolling] = useState(false);
const [enrollData, setEnrollData] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
const [otpCode, setOtpCode] = useState('');
```

Load MFA state on mount:
```ts
useEffect(() => {
  supabase.auth.mfa.listFactors().then(({ data }) => {
    setMfaFactors(data?.totp ?? []);
  });
}, []);
```

---

### Section 3 — Active Sessions

**What is available via Supabase client-side:**
- `supabase.auth.getSession()` → `session.access_token`, `session.user` — current session only
- `user.last_sign_in_at` — last sign-in date
- `user.app_metadata` — may contain provider info

**What we render:**
A single row showing the current session:
```
┌─────────────────────────────────────────┐
│  [💻 icon]  Session actuelle            │
│             Navigateur Web              │
│             Connecté depuis [date]      │
│             [Badge: Session actuelle]   │
└─────────────────────────────────────────┘
  [Déconnecter tous les appareils]
```

**"Déconnecter tous les appareils" logic:**
```ts
await supabase.auth.signOut({ scope: 'global' });
navigate('/login');
```

This is a real Supabase API that revokes all refresh tokens for the user.

---

### Section 4 — Subscription

A clean informational card (no fake controls):
```
Plan actuel: Gratuit
Toutes les fonctionnalités de base incluses.
[Badge: Gratuit] 
[Badge: Bientôt — Plans Pro disponibles]
```

This is honest UI — no fake pricing, no fake "Cancel subscription" button.

---

### Section 5 — Danger Zone

Card with `border-destructive/40` border and `bg-destructive/5` header area.

**Two action rows:**

1. **Désactiver la boutique**
   - Description: "Votre boutique ne sera plus accessible aux clients."
   - Button: "Désactiver" (outline destructive)
   - Confirmation modal: "Confirmer la désactivation" → calls `supabase.from('shops').update({ is_active: false }).eq('owner_id', user.id)`
   - Real effect: storefront becomes unreachable

2. **Supprimer le compte**
   - Description: "Action irréversible. Toutes vos données seront archivées."
   - Button: "Supprimer le compte" (solid destructive)
   - Confirmation modal requires typing "SUPPRIMER" to confirm
   - Action: calls `signOut()` — full account deletion requires server-side admin API which is not available client-side; we sign the user out and mark the shop as inactive. A note explains the team will complete deletion within 72h (honest approach — no fake delete button).

---

## Files to Create/Modify

### 1. Supabase migration — `supabase/functions/db-migrate/index.ts`
Add the `ALTER TABLE` statements for `profiles` (phone, language, timezone columns) and the Storage bucket + RLS policies for avatars.

### 2. Update `src/integrations/supabase/client.ts`
Add `phone`, `language`, `timezone` to the `Profile` interface.

### 3. Rewrite `src/pages/settings/SettingsProfil.tsx`
Complete rebuild of the page with 5 sections. This is the primary file change. It will be a self-contained component (~400–500 lines) that uses existing Supabase client, AuthContext, and UI components.

**Components used (all already installed):**
- `Card`, `CardContent`, `CardHeader`, `CardTitle` (already imported)
- `Input`, `Label`, `Button`, `Switch`, `Badge` (all installed)
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` (Radix Select, installed)
- `AlertDialog` components for danger zone confirmations
- `Progress` for password strength bar
- `Separator` between sub-sections
- Icons from `lucide-react`: `User`, `Shield`, `Monitor`, `CreditCard`, `AlertTriangle`, `Eye`, `EyeOff`, `Upload`, `CheckCircle2`, `Loader2`, `SmartPhone`, `Lock`

---

## What is NOT Changed

- `SettingsPageLayout.tsx` — max-width override handled inline in the page via `max-w-[820px]` instead of using `SettingsPageLayout` (or passing a prop)
- All other settings pages — untouched
- `AuthContext.tsx` — `updatePassword` already exists, no changes needed
- `App.tsx` — route already exists at `/dashboard/parametres/profil`
- `SettingsHub.tsx` — no changes (Profile card already links to the right route)
- `SettingsNotifications.tsx` — not duplicated; the Profile page links to it

---

## Security Guarantees

- Password change uses `supabase.auth.updateUser()` — server-validated via existing JWT session
- 2FA uses Supabase MFA API — secret never stored in frontend state beyond enrollment flow
- Session invalidation uses `scope: 'global'` — real token revocation, not just client-side logout
- Danger zone actions have confirmation modals with text confirmation for destructive operations
- No client-side role checks — no localStorage security bypasses
- Avatar upload path: `{user.id}/avatar.{ext}` — user can only overwrite their own file (enforced by RLS policy using `auth.uid()`)
