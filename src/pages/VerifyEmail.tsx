import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, ShieldCheck } from 'lucide-react';

import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function VerifyEmail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const email = searchParams.get('email') || '';
  const type = searchParams.get('type') || 'signup';
  const tokenFromUrl = searchParams.get('token');
  const userId = searchParams.get('uid') || '';

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Auto-verify if token is in URL
  useEffect(() => {
    if (tokenFromUrl && email) {
      setIsVerifyingToken(true);
      verifyWithToken(tokenFromUrl);
    }
  }, [tokenFromUrl, email]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Start cooldown on mount
  useEffect(() => {
    setResendCooldown(60);
  }, []);

  const verifyWithToken = async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { action: 'verify', email, token, type },
      });

      if (error || data?.error) {
        toast({
          variant: 'destructive',
          title: t('common.error'),
          description: t('auth.otp.invalidOrExpired'),
        });
        setIsVerifyingToken(false);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      setIsVerifyingToken(false);
    }
  };

  const handleVerifyOTP = useCallback(async (code: string) => {
    if (code.length !== 5) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { action: 'verify', email, otp: code, type },
      });

      if (error || data?.error) {
        let message = t('auth.otp.invalidOrExpired');
        if (data?.error === 'wrong_code') {
          message = t('auth.otp.wrongCode', { remaining: data.attempts_remaining });
        } else if (data?.error === 'locked') {
          message = t('auth.otp.locked', { minutes: data.minutes_left });
        } else if (data?.error === 'expired') {
          message = t('auth.otp.expired');
        }

        toast({ variant: 'destructive', title: t('common.error'), description: message });
        setOtp('');
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      toast({ variant: 'destructive', title: t('common.error'), description: t('auth.errors.generic') });
      setIsLoading(false);
    }
  }, [email, type, navigate, toast, t]);

  const handleResend = async () => {
    if (resendCooldown > 0 || !userId) return;

    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { action: 'resend', email, type, user_id: userId },
      });

      if (error || data?.error) {
        if (data?.error === 'cooldown') {
          setResendCooldown(data.wait_seconds);
        } else {
          toast({ variant: 'destructive', title: t('common.error'), description: t('auth.errors.generic') });
        }
        return;
      }

      setResendCooldown(60);
      toast({ title: t('auth.otp.resent') });
    } catch {
      toast({ variant: 'destructive', title: t('common.error'), description: t('auth.errors.generic') });
    }
  };

  // Auto-submit when all 5 digits entered
  useEffect(() => {
    if (otp.length === 5) {
      handleVerifyOTP(otp);
    }
  }, [otp, handleVerifyOTP]);

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
            <CardTitle className="text-2xl font-bold">{t('auth.otp.successTitle')}</CardTitle>
            <CardDescription>{t('auth.otp.successMessage')}</CardDescription>
          </CardHeader>
        </Card>
      </AuthLayout>
    );
  }

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
            <InputOTP
              maxLength={5}
              value={otp}
              onChange={setOtp}
              disabled={isLoading}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="w-12 h-14 text-xl sm:w-14 sm:h-16 sm:text-2xl" />
                <InputOTPSlot index={1} className="w-12 h-14 text-xl sm:w-14 sm:h-16 sm:text-2xl" />
                <InputOTPSlot index={2} className="w-12 h-14 text-xl sm:w-14 sm:h-16 sm:text-2xl" />
                <InputOTPSlot index={3} className="w-12 h-14 text-xl sm:w-14 sm:h-16 sm:text-2xl" />
                <InputOTPSlot index={4} className="w-12 h-14 text-xl sm:w-14 sm:h-16 sm:text-2xl" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {isLoading && (
            <div className="flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">{t('auth.otp.noCode')}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={resendCooldown > 0}
            >
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
