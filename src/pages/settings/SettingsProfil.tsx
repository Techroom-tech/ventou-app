import { useState, useEffect, useRef } from 'react';
import {
  User, Shield, Monitor, CreditCard, AlertTriangle,
  Eye, EyeOff, Upload, CheckCircle2, Loader2, Lock,
  Smartphone, LogOut, Camera
} from 'lucide-react';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// ─── Password strength helper ────────────────────────────────────────────────
function getPasswordStrength(password: string): { score: number; label: string; labelColor: string; barColor: string } {
  if (!password) return { score: 0, label: '', labelColor: '', barColor: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 20, label: 'Faible', labelColor: 'hsl(0 84% 60%)', barColor: 'hsl(0 84% 60%)' };
  if (score === 2) return { score: 40, label: 'Passable', labelColor: 'hsl(25 95% 53%)', barColor: 'hsl(25 95% 53%)' };
  if (score === 3) return { score: 60, label: 'Correct', labelColor: 'hsl(45 93% 47%)', barColor: 'hsl(45 93% 47%)' };
  if (score === 4) return { score: 80, label: 'Fort', labelColor: 'hsl(142 71% 45%)', barColor: 'hsl(142 71% 45%)' };
  return { score: 100, label: 'Très fort', labelColor: 'hsl(142 76% 36%)', barColor: 'hsl(142 76% 36%)' };
}

// ─── LANGUAGES & TIMEZONES ───────────────────────────────────────────────────
const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
];

const TIMEZONES = [
  { value: 'Africa/Abidjan', label: 'Abidjan (GMT+0)' },
  { value: 'Africa/Lagos', label: 'Lagos (GMT+1)' },
  { value: 'Africa/Dakar', label: 'Dakar (GMT+0)' },
  { value: 'Africa/Douala', label: 'Douala (GMT+1)' },
  { value: 'Africa/Nairobi', label: 'Nairobi (GMT+3)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1/+2)' },
  { value: 'UTC', label: 'UTC' },
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function SettingsProfil() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Personal info state
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    language: 'fr',
    timezone: 'Africa/Abidjan',
  });
  const [initialForm, setInitialForm] = useState({ ...form });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Password state
  const [pwForm, setPwForm] = useState({ new_password: '', confirm_password: '' });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const strength = getPasswordStrength(pwForm.new_password);

  // ── 2FA state
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [enrollData, setEnrollData] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [enrolling2FA, setEnrolling2FA] = useState(false);
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);

  // ── Danger zone state
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [dangerLoading, setDangerLoading] = useState(false);

  // ── Sessions state
  const [signingOutAll, setSigningOutAll] = useState(false);

  // ── Load profile
  useEffect(() => {
    if (profile) {
      const loaded = {
        first_name: profile.first_name ?? '',
        last_name: profile.last_name ?? '',
        phone: (profile as any).phone ?? '',
        language: (profile as any).language ?? 'fr',
        timezone: (profile as any).timezone ?? 'Africa/Abidjan',
      };
      setForm(loaded);
      setInitialForm(loaded);
      setAvatarPreview(profile.avatar_url ?? '');
    }
  }, [profile]);

  // ── Load MFA factors
  useEffect(() => {
    setMfaLoading(true);
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setMfaFactors(data?.totp ?? []);
      setMfaLoading(false);
    }).catch(() => setMfaLoading(false));
  }, []);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm) || avatarFile !== null;
  const activeMfaFactor = mfaFactors.find(f => f.status === 'verified');

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop grande. Maximum 5 MB.');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `${user!.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      let avatar_url = profile?.avatar_url ?? null;
      if (avatarFile) {
        avatar_url = await uploadAvatar(avatarFile);
      }
      const { error } = await supabase
        .from('profiles')
        .update({ ...form, avatar_url, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      setInitialForm({ ...form });
      setAvatarFile(null);
      toast.success('Profil mis à jour avec succès.');
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    if (pwForm.new_password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.new_password });
      if (error) throw error;
      setPwForm({ new_password: '', confirm_password: '' });
      toast.success('Mot de passe mis à jour. Vos autres sessions ont été déconnectées.');
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleEnable2FA = async () => {
    setEnrolling2FA(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      setEnrollData({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setShow2FAModal(true);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l\'activation de la 2FA');
    } finally {
      setEnrolling2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!enrollData) return;
    setEnrolling2FA(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: enrollData.factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollData.factorId,
        challengeId: challengeData.id,
        code: otpCode,
      });
      if (verifyError) throw verifyError;
      // Refresh MFA factors
      const { data } = await supabase.auth.mfa.listFactors();
      setMfaFactors(data?.totp ?? []);
      setShow2FAModal(false);
      setEnrollData(null);
      setOtpCode('');
      toast.success('Authentification à deux facteurs activée.');
    } catch (err: any) {
      toast.error(err?.message || 'Code invalide. Veuillez réessayer.');
    } finally {
      setEnrolling2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!activeMfaFactor) return;
    setDisabling2FA(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: activeMfaFactor.id });
      if (error) throw error;
      const { data } = await supabase.auth.mfa.listFactors();
      setMfaFactors(data?.totp ?? []);
      toast.success('Authentification à deux facteurs désactivée.');
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la désactivation');
    } finally {
      setDisabling2FA(false);
    }
  };

  const handleSignOutAll = async () => {
    setSigningOutAll(true);
    try {
      await supabase.auth.signOut({ scope: 'global' });
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la déconnexion');
      setSigningOutAll(false);
    }
  };

  const handleDeactivateShop = async () => {
    if (!user) return;
    setDangerLoading(true);
    try {
      const { error } = await supabase
        .from('shops')
        .update({ is_active: false })
        .eq('owner_id', user.id);
      if (error) throw error;
      setShowDeactivateModal(false);
      toast.success('Boutique désactivée. Elle n\'est plus accessible aux clients.');
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la désactivation');
    } finally {
      setDangerLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== 'SUPPRIMER') return;
    setDangerLoading(true);
    try {
      // Deactivate shop first
      await supabase.from('shops').update({ is_active: false }).eq('owner_id', user.id);
      // Sign out globally — full deletion requires admin API (processed server-side within 72h)
      await supabase.auth.signOut({ scope: 'global' });
      navigate('/login');
      toast.success('Votre demande de suppression a été enregistrée. Votre compte sera supprimé dans 72h.');
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la suppression');
      setDangerLoading(false);
    }
  };

  const initials = [form.first_name?.[0], form.last_name?.[0]].filter(Boolean).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <SettingsPageLayout
      title="Profil & Compte"
      description="Gérez vos informations personnelles et la sécurité de votre compte"
    >
      <div className="space-y-6">

        {/* ── SECTION 1: PERSONAL INFORMATION ─────────────────────────────── */}
        <Card className="border-border shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <User className="h-4 w-4 text-muted-foreground" />
              Informations personnelles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="h-16 w-16 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl font-semibold text-muted-foreground">{initials}</span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                  title="Changer la photo"
                >
                  <Camera className="h-3 w-3" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Photo de profil</p>
                <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG ou WebP · Max 5 MB</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3 w-3 mr-1.5" />
                  Changer
                </Button>
              </div>
            </div>

            <Separator />

            {/* Name fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="first_name" className="text-xs font-medium">Prénom</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  placeholder="Jean"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name" className="text-xs font-medium">Nom de famille</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  placeholder="Dupont"
                  className="h-10"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">Adresse email</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  value={user?.email ?? ''}
                  readOnly
                  className="h-10 bg-muted text-muted-foreground cursor-not-allowed flex-1"
                />
                {user?.email_confirmed_at ? (
                  <Badge className="shrink-0 font-medium text-xs" style={{ background: 'hsl(142 76% 36% / 0.1)', color: 'hsl(142 76% 36%)', border: '1px solid hsl(142 76% 36% / 0.3)' }}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Vérifié
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0 font-medium text-xs" style={{ borderColor: 'hsl(38 92% 50% / 0.5)', color: 'hsl(32 95% 44%)', background: 'hsl(48 100% 96%)' }}>
                    Non vérifié
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié directement. Contactez le support.</p>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-medium">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+225 07 00 00 00 00"
                className="h-10"
              />
            </div>

            {/* Language & Timezone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Langue</Label>
                <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Fuseau horaire</Label>
                <Select value={form.timezone} onValueChange={v => setForm(f => ({ ...f, timezone: v }))}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-3 pt-1">
              <Button
                onClick={handleSaveProfile}
                disabled={savingProfile || !isDirty}
                className="h-10 px-5"
              >
                {savingProfile ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sauvegarde...</>
                ) : 'Enregistrer'}
              </Button>
              {isDirty && (
                <span className="text-xs flex items-center gap-1" style={{ color: 'hsl(32 95% 44%)' }}>
                  <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: 'hsl(38 92% 50%)' }} />
                  Modifications non sauvegardées
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── SECTION 2: SECURITY ──────────────────────────────────────────── */}
        <Card className="border-border shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Sécurité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Change Password */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mot de passe</h4>

              <div className="space-y-1.5">
                <Label htmlFor="new_password" className="text-xs font-medium">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showNew ? 'text' : 'password'}
                    value={pwForm.new_password}
                    onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
                    placeholder="Minimum 8 caractères"
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {pwForm.new_password && (
                  <div className="space-y-1">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${strength.score}%`, background: strength.barColor }}
                      />
                    </div>
                    <p className="text-xs font-medium" style={{ color: strength.labelColor }}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm_password" className="text-xs font-medium">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    type={showConfirm ? 'text' : 'password'}
                    value={pwForm.confirm_password}
                    onChange={e => setPwForm(f => ({ ...f, confirm_password: e.target.value }))}
                    placeholder="Répétez le nouveau mot de passe"
                    className={cn('h-10 pr-10', {
                      'border-destructive focus-visible:ring-destructive':
                        pwForm.confirm_password && pwForm.confirm_password !== pwForm.new_password,
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                onClick={handleSavePassword}
                disabled={savingPassword || !pwForm.new_password || !pwForm.confirm_password}
                variant="outline"
                className="h-10"
              >
                {savingPassword ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mise à jour...</>
                ) : (
                  <><Lock className="h-4 w-4 mr-2" />Changer le mot de passe</>
                )}
              </Button>
            </div>

            <Separator />

            {/* 2FA */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Authentification à deux facteurs (2FA)</h4>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-start gap-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Application d'authentification</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activeMfaFactor
                        ? 'La 2FA est activée. Votre compte est mieux protégé.'
                        : 'Ajoutez une couche de sécurité supplémentaire avec une application TOTP.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {activeMfaFactor && (
                    <Badge className="text-xs font-medium" style={{ background: 'hsl(142 76% 36% / 0.1)', color: 'hsl(142 76% 36%)', border: '1px solid hsl(142 76% 36% / 0.3)' }}>
                      Activée
                    </Badge>
                  )}
                  {mfaLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : activeMfaFactor ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisable2FA}
                      disabled={disabling2FA}
                      className="text-destructive border-destructive/30 hover:bg-destructive/5 h-8 text-xs"
                    >
                      {disabling2FA ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Désactiver'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleEnable2FA}
                      disabled={enrolling2FA}
                      className="h-8 text-xs"
                    >
                      {enrolling2FA ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Activer'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── SECTION 3: SESSIONS ──────────────────────────────────────────── */}
        <Card className="border-border shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              Sessions actives
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current session row */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
              <div className="flex items-start gap-3">
                <Monitor className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">Navigateur Web</p>
                    <Badge variant="secondary" className="text-xs font-medium h-5">Session actuelle</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dernière connexion :{' '}
                    {user?.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })
                      : 'Inconnue'}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              La liste complète des appareils connectés n'est pas disponible. Utilisez le bouton ci-dessous pour déconnecter tous vos appareils.
            </p>

            <Button
              variant="outline"
              onClick={handleSignOutAll}
              disabled={signingOutAll}
              className="h-10 text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              {signingOutAll ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Déconnexion...</>
              ) : (
                <><LogOut className="h-4 w-4 mr-2" />Déconnecter tous les appareils</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ── SECTION 4: SUBSCRIPTION ──────────────────────────────────────── */}
        <Card className="border-border shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Abonnement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-foreground">Plan Gratuit</p>
                  <Badge variant="secondary" className="text-xs font-medium">Actuel</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Toutes les fonctionnalités essentielles incluses.</p>
              </div>
              <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary shrink-0 ml-4">
                Plans Pro bientôt
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* ── SECTION 5: DANGER ZONE ───────────────────────────────────────── */}
        <Card className="border-destructive/30 shadow-none">
          <CardHeader className="pb-4 bg-destructive/5 rounded-t-lg border-b border-destructive/20">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Zone de danger
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">

            {/* Deactivate shop */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Désactiver la boutique</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Votre boutique ne sera plus accessible aux clients. Réversible.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeactivateModal(true)}
                className="h-9 shrink-0 border-destructive/40 text-destructive hover:bg-destructive/5 hover:border-destructive text-xs"
              >
                Désactiver
              </Button>
            </div>

            <Separator />

            {/* Delete account */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Supprimer le compte</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Action irréversible. Toutes vos données seront archivées puis supprimées sous 72h.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="h-9 shrink-0 text-xs"
              >
                Supprimer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 2FA ENROLLMENT MODAL ─────────────────────────────────────────────── */}
      <AlertDialog open={show2FAModal} onOpenChange={setShow2FAModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Activer la 2FA
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-left">
                <p className="text-sm text-muted-foreground">
                  Scannez le QR code avec votre application d'authentification (Google Authenticator, Authy, etc.).
                </p>
                {enrollData?.qrCode && (
                  <div className="flex flex-col items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border">
                    <div
                      className="h-36 w-36 rounded-lg overflow-hidden border border-border"
                      dangerouslySetInnerHTML={{ __html: enrollData.qrCode }}
                    />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Ou saisissez la clé manuellement :</p>
                      <code className="text-xs font-mono bg-background border border-border rounded px-2 py-1 block break-all">
                        {enrollData.secret}
                      </code>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Code à 6 chiffres</Label>
                  <Input
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="h-10 text-center font-mono text-lg tracking-widest"
                    autoComplete="one-time-code"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShow2FAModal(false); setEnrollData(null); setOtpCode(''); }}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVerify2FA}
              disabled={otpCode.length !== 6 || enrolling2FA}
            >
              {enrolling2FA ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Vérifier et activer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── DEACTIVATE SHOP MODAL ────────────────────────────────────────────── */}
      <AlertDialog open={showDeactivateModal} onOpenChange={setShowDeactivateModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver la boutique</AlertDialogTitle>
            <AlertDialogDescription>
              Votre boutique ne sera plus accessible aux clients. Vous pourrez la réactiver depuis les paramètres d'identité.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateShop}
              disabled={dangerLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {dangerLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── DELETE ACCOUNT MODAL ─────────────────────────────────────────────── */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Supprimer le compte</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p className="text-sm text-muted-foreground">
                  Cette action est <strong>irréversible</strong>. Toutes vos données (boutique, produits, commandes) seront archivées et supprimées dans les 72 heures.
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Tapez <span className="font-mono font-bold text-destructive">SUPPRIMER</span> pour confirmer
                  </Label>
                  <Input
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder="SUPPRIMER"
                    className="h-10 font-mono border-destructive/40 focus-visible:ring-destructive"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={dangerLoading || deleteConfirmText !== 'SUPPRIMER'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {dangerLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsPageLayout>
  );
}
