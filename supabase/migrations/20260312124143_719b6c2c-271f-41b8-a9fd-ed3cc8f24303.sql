
INSERT INTO public.email_templates (slug, name, subject, body, is_active) VALUES
('otp_signup', 'Vérification OTP - Inscription', 'Confirmez votre compte Ventou', '<h2 style="color:#111827;margin:0 0 20px;">Confirmez votre compte</h2>
<p>Bienvenue sur Ventou ! Voici votre code de vérification :</p>
<div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
  <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#111827;">{{otp_code}}</span>
</div>
<p style="color:#6b7280;font-size:13px;">Ce code expire dans {{expiry_minutes}} minutes.</p>
<p>Ou cliquez sur le lien ci-dessous :</p>
<div style="text-align:center;margin:24px 0;">
  <a href="{{verify_link}}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Vérifier mon email</a>
</div>
<p style="color:#9ca3af;font-size:12px;">Si vous n''avez pas créé de compte, ignorez cet email.</p>', true),

('otp_password_reset', 'Vérification OTP - Réinitialisation', 'Réinitialisez votre mot de passe Ventou', '<h2 style="color:#111827;margin:0 0 20px;">Réinitialisation du mot de passe</h2>
<p>Vous avez demandé la réinitialisation de votre mot de passe. Voici votre code de vérification :</p>
<div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
  <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#111827;">{{otp_code}}</span>
</div>
<p style="color:#6b7280;font-size:13px;">Ce code expire dans {{expiry_minutes}} minutes.</p>
<p>Ou cliquez sur le lien ci-dessous :</p>
<div style="text-align:center;margin:24px 0;">
  <a href="{{verify_link}}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Réinitialiser mon mot de passe</a>
</div>
<p style="color:#9ca3af;font-size:12px;">Si vous n''avez pas demandé cette réinitialisation, ignorez cet email.</p>', true);
