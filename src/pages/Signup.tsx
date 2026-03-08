import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, User, Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

import { AuthLayout } from '@/components/AuthLayout';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function Signup() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const signupSchema = z.object({
    firstName: z.string().min(1, t('auth.validation.firstNameRequired')),
    lastName: z.string().min(1, t('auth.validation.lastNameRequired')),
    email: z.string().email(t('auth.validation.emailInvalid')),
    password: z.string().min(8, t('auth.validation.passwordMin')),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.validation.passwordMatch'),
    path: ['confirmPassword'],
  });

  type SignupFormValues = z.infer<typeof signupSchema>;

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);

    const { error } = await signUp(data.email, data.password, {
      first_name: data.firstName,
      last_name: data.lastName,
    });

    if (error) {
      let errorMessage = t('auth.errors.generic');
      
      if (error.message?.includes('already registered')) {
        errorMessage = 'Cet email est déjà utilisé';
      }

      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: errorMessage,
      });
    } else {
      setUserEmail(data.email);
      setIsSuccess(true);
    }

    setIsLoading(false);
  };

  if (isSuccess) {
    return (
      <AuthLayout>
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const, delay: 0.1 }}
              className="mx-auto w-12 h-12 bg-ventou-success/10 rounded-full flex items-center justify-center mb-4"
            >
              <CheckCircle className="h-6 w-6 text-ventou-success" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const, delay: 0.3 }}
            >
              <CardTitle className="text-2xl font-bold">{t('auth.verifyEmail.title')}</CardTitle>
              <CardDescription className="mt-2">
                {t('auth.verifyEmail.subtitle')} <strong>{userEmail}</strong>
              </CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const, delay: 0.5 }}
            >
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  {t('auth.forgotPassword.backToLogin')}
                </Button>
              </Link>
            </motion.div>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl font-bold">{t('auth.signup.title')}</CardTitle>
          </motion.div>
          <motion.div variants={itemVariants}>
            <CardDescription>{t('auth.signup.subtitle')}</CardDescription>
          </motion.div>
        </CardHeader>
        <CardContent className="space-y-4">
          <motion.div variants={itemVariants}>
            <GoogleSignInButton />
          </motion.div>

          <motion.div variants={itemVariants} className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t('common.or')}</span>
            </div>
          </motion.div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.signup.firstName')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder={t('auth.signup.firstNamePlaceholder')}
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.signup.lastName')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('auth.signup.lastNamePlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.signup.email')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder={t('auth.signup.emailPlaceholder')}
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.signup.password')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder={t('auth.signup.passwordPlaceholder')}
                            className="pl-10 pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.signup.confirmPassword')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder={t('auth.signup.confirmPasswordPlaceholder')}
                            className="pl-10 pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <p className="text-xs text-muted-foreground text-center">
                  {t('auth.signup.terms')}{' '}
                  <Link to="/terms" className="text-accent hover:underline">
                    {t('auth.signup.termsLink')}
                  </Link>{' '}
                  {t('common.and')}{' '}
                  <Link to="/privacy" className="text-accent hover:underline">
                    {t('auth.signup.privacyLink')}
                  </Link>
                </p>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Button
                  type="submit"
                  size="cta"
                  className="w-full bg-accent hover:bg-accent/90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    t('auth.signup.submit')
                  )}
                </Button>
              </motion.div>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <motion.p variants={itemVariants} className="text-center text-sm text-muted-foreground w-full">
            {t('auth.signup.hasAccount')}{' '}
            <Link to="/login" className="text-accent hover:underline font-medium">
              {t('auth.signup.loginLink')}
            </Link>
          </motion.p>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}
