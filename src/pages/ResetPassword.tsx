import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, ShieldCheck } from 'lucide-react';

import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const email = searchParams.get('email') || '';
  const tokenFromUrl = searchParams.get('token');

  const [step, setStep] = useState<'otp' | 'password'>(tokenFromUrl ? 'password' : 'otp');
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);
  const [verifiedResetProof, setVerifiedResetProof] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  const resetPasswordSchema = z.object({
    password: z.string().min(8, t('auth.validation.passwordMin')),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.validation.passwordMatch'),
    path: ['confirmPassword'],
  });

  type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  // Auto-verify token from URL
  useEffect(() => {
    if (tokenFromUrl && email) {
      setIsVerifyingToken(true);
      verifyToken(tokenFromUrl);
    }
  }, [tokenFromUrl, email]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const verifyToken = async (token: string) => {
    const { data, error } = await supabase.functions.invoke('verify-otp', {
      body: { action: 'verify', email, token, type: 'password_reset' },
    });

    if (error || data?.error) {
      toast({ variant: 'destructive', title: t('common.error'), description: t('auth.otp.invalidOrExpired') });
      setIsVerifyingToken(false);
      setStep('otp');
      return;
    }

    setVerifiedUserId(data.user_id);
    setVerifiedResetProof(data.reset_proof ?? null);
    setIsVerifyingToken(false);
    setStep('password');
  };

  const handleVerifyOTP = useCallback(async (code: string) => {
    if (code.length !== 5) return;
    setIsVerifying(true);

    const { data, error } = await supabase.functions.invoke('verify-otp', {
      body: { action: 'verify', email, otp: code, type: 'password_reset' },
    });

    if (error || data?.error) {
      let message = t('auth.otp.invalidOrExpired');
      if (data?.error === 'wrong_code') message = t('auth.otp.wrongCode', { remaining: data.attempts_remaining });
      else if (data?.error === 'locked') message = t('auth.otp.locked', { minutes: data.minutes_left });
      else if (data?.error === 'expired') message = t('auth.otp.expired');

      toast({ variant: 'destructive', title: t('common.error'), description: message });
      setOtp('');
      setIsVerifying(false);
      return;
    }

    setVerifiedUserId(data.user_id);
    setVerifiedResetProof(data.reset_proof ?? null);
    setStep('password');
    setIsVerifying(false);
  }, [email, toast, t]);

  // Auto-submit OTP
  useEffect(() => {
    if (otp.length === 5) handleVerifyOTP(otp);
  }, [otp, handleVerifyOTP]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    const { data, error } = await supabase.functions.invoke('verify-otp', {
      body: { action: 'resend', email, type: 'password_reset', user_id: email },
    });
    if (data?.error === 'cooldown') {
      setResendCooldown(data.wait_seconds);
    } else {
      setResendCooldown(60);
      toast({ title: t('auth.otp.resent') });
    }
  };

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!verifiedUserId || !verifiedResetProof) return;
    setIsLoading(true);

    // Use admin API via edge function to update password
    const { data: result, error } = await supabase.functions.invoke('verify-otp', {
      body: {
        action: 'update_password',
        user_id: verifiedUserId,
        reset_proof: verifiedResetProof,
        password: data.password,
      },
    });

    // Fallback: if user has active session, use client-side update
    if (error) {
      const { error: updateError } = await updatePassword(data.password);
      if (updateError) {
        toast({ variant: 'destructive', title: t('common.error'), description: t('auth.errors.generic') });
        setIsLoading(false);
        return;
      }
    }

    setIsSuccess(true);
    setTimeout(() => navigate('/login'), 2000);
    setIsLoading(false);
  };

  if (isVerifyingToken) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-muted-foreground">{t('auth.otp.verifyingLink')}</p>
        </div>
      </AuthLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthLayout>
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 bg-ventou-success/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-ventou-success" />
            </div>
            <CardTitle className="text-2xl font-bold">{t('common.success')}</CardTitle>
            <CardDescription>{t('auth.resetPassword.successMessage')}</CardDescription>
          </CardHeader>
        </Card>
      </AuthLayout>
    );
  }

  // Step 1: OTP
  if (step === 'otp') {
    return (
      <AuthLayout>
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6 text-accent" />
            </div>
            <CardTitle className="text-2xl font-bold">{t('auth.otp.title')}</CardTitle>
            <CardDescription>
              {t('auth.otp.subtitle')} <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={5} value={otp} onChange={setOtp} disabled={isVerifying}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="w-12 h-14 text-xl sm:w-14 sm:h-16 sm:text-2xl" />
                  <InputOTPSlot index={1} className="w-12 h-14 text-xl sm:w-14 sm:h-16 sm:text-2xl" />
                  <InputOTPSlot index={2} className="w-12 h-14 text-xl sm:w-14 sm:h-16 sm:text-2xl" />
                  <InputOTPSlot index={3} className="w-12 h-14 text-xl sm:w-14 sm:h-16 sm:text-2xl" />
                  <InputOTPSlot index={4} className="w-12 h-14 text-xl sm:w-14 sm:h-16 sm:text-2xl" />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {isVerifying && (
              <div className="flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
            )}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">{t('auth.otp.noCode')}</p>
              <Button variant="ghost" size="sm" onClick={handleResend} disabled={resendCooldown > 0}>
                {resendCooldown > 0
                  ? t('auth.otp.resendIn', { seconds: resendCooldown })
                  : t('auth.otp.resend')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  // Step 2: New password
  return (
    <AuthLayout>
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">{t('auth.resetPassword.title')}</CardTitle>
          <CardDescription>{t('auth.resetPassword.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.resetPassword.password')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t('auth.resetPassword.passwordPlaceholder')}
                          className="pl-10 pr-10"
                          {...field}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.resetPassword.confirmPassword')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
                          className="pl-10 pr-10"
                          {...field}
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('auth.resetPassword.submit')
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
