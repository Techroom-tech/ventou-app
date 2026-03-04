import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  ArrowRight,
  Play,
  CheckCircle,
  Smartphone,
  Package,
  BarChart3,
  UserPlus,
  Camera,
  Wallet,
  Shield,
  Headphones,
  RefreshCw,
  Lock,
  Star,
  MapPin,
} from 'lucide-react';

const Index = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Auto-redirect logged-in vendors to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    {
      icon: Smartphone,
      title: t('home.features.mobile.title'),
      description: t('home.features.mobile.description'),
    },
    {
      icon: Package,
      title: t('home.features.stock.title'),
      description: t('home.features.stock.description'),
    },
    {
      icon: BarChart3,
      title: t('home.features.analytics.title'),
      description: t('home.features.analytics.description'),
    },
  ];

  const steps = [
    {
      number: '1',
      icon: UserPlus,
      title: t('home.howItWorks.step1.title'),
      description: t('home.howItWorks.step1.description'),
    },
    {
      number: '2',
      icon: Camera,
      title: t('home.howItWorks.step2.title'),
      description: t('home.howItWorks.step2.description'),
    },
    {
      number: '3',
      icon: Wallet,
      title: t('home.howItWorks.step3.title'),
      description: t('home.howItWorks.step3.description'),
    },
  ];

  const securityPoints = [
    { icon: Headphones, title: t('home.security.support.title'), description: t('home.security.support.description') },
    { icon: RefreshCw, title: t('home.security.refund.title') },
    { icon: Lock, title: t('home.security.encryption.title') },
  ];

  const partners = ['Orange', 'MTN', 'Wave', 'Moov'];

  const testimonials = [
    {
      text: t('home.testimonials.testimonial1.text'),
      author: t('home.testimonials.testimonial1.author'),
      location: t('home.testimonials.testimonial1.location'),
      rating: 5,
    },
    {
      text: t('home.testimonials.testimonial2.text'),
      author: t('home.testimonials.testimonial2.author'),
      location: t('home.testimonials.testimonial2.location'),
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 md:pt-32 md:pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <Badge className="mb-4 bg-accent/10 text-accent border-accent/20 animate-pulse">
                {t('home.badge')}
              </Badge>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-4 leading-tight">
                {t('home.hero.title1')}{' '}
                <span className="text-primary">{t('home.hero.title2')}</span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground mb-6 max-w-xl mx-auto lg:mx-0">
                {t('home.hero.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link to={user ? '/dashboard' : '/signup'}>
                  <Button size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-lg px-8">
                    {t('home.hero.cta')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="ghost" className="w-full sm:w-auto text-muted-foreground">
                  <Play className="mr-2 h-5 w-5" />
                  {t('home.hero.demo')}
                </Button>
              </div>
            </div>

            {/* Right - Success Notification Card */}
            <div className="hidden lg:flex justify-center lg:justify-end">
              <Card className="w-72 shadow-xl border-primary/20 animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs text-emerald-500 font-semibold">{t('home.hero.notificationSuccess')}</p>
                      <p className="text-sm font-medium text-foreground">{t('home.hero.notification')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-20 px-4 sm:px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3">
              {t('home.features.title')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('home.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card border border-border hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 md:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground text-center mb-10 md:mb-12">
            {t('home.howItWorks.title')}
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-accent/10 rounded-2xl" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <step.icon className="h-8 w-8 text-accent" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">{step.number}</span>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-12 md:py-20 px-4 sm:px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                {t('home.security.badge')}
              </Badge>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
                {t('home.security.title')}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t('home.security.subtitle')}
              </p>
              <div className="flex justify-center md:justify-start">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Shield className="h-10 w-10 text-primary" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {securityPoints.map((point, index) => (
                <Card key={index} className="bg-card border border-border">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <point.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{point.title}</h4>
                      {point.description && (
                        <p className="text-sm text-muted-foreground">{point.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-10 md:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs md:text-sm font-semibold text-muted-foreground tracking-widest mb-6">
            {t('home.partners.title')}
          </p>
          <div className="flex flex-wrap justify-center gap-6 md:gap-10">
            {partners.map((partner) => (
              <div
                key={partner}
                className="px-6 py-3 bg-secondary/50 rounded-lg text-lg md:text-xl font-bold text-muted-foreground"
              >
                {partner}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 md:py-20 px-4 sm:px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground text-center mb-10 md:mb-12">
            {t('home.testimonials.title')}
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-card border border-border">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-foreground mb-4 italic">"{testimonial.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                      <span className="text-accent font-semibold">{testimonial.author[0]}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.author}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {testimonial.location}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-12 md:py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {t('home.cta.title')}
          </h2>
          <p className="text-muted-foreground mb-8">
            {t('home.cta.subtitle')}
          </p>
          <Link to={user ? '/dashboard' : '/signup'}>
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-lg px-8">
              {t('home.cta.button')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 md:py-16 px-4 sm:px-6 border-t border-border bg-secondary/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Logo & Description */}
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl">V</span>
                </div>
                <span className="text-xl font-bold text-foreground">VENTOU</span>
              </Link>
              <p className="text-muted-foreground text-sm max-w-xs">
                {t('home.footer.description')}
              </p>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">{t('home.footer.company')}</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {t('home.footer.about')}
                  </Link>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {t('home.footer.pricing')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {t('home.footer.careers')}
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">{t('home.footer.legal')}</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {t('home.footer.privacy')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {t('home.footer.terms')}
                  </a>
                </li>
                <li>
                  <Link to="/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {t('home.footer.contact')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-6 text-center">
            <p className="text-sm text-muted-foreground">{t('home.footer.copyright')}</p>
          </div>
        </div>
      </footer>

      {/* Mobile Floating CTA */}
      {isMobile && (
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <Link to={user ? '/dashboard' : '/signup'}>
            <Button className="w-full bg-accent hover:bg-accent/90 shadow-lg h-12">
              {t('home.footer.floatingCta')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Decorative background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-accent/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-primary/5 to-transparent rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default Index;
