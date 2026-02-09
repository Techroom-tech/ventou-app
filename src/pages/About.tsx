import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  ArrowRight, 
  AlertTriangle, 
  Shield, 
  Signal, 
  Lightbulb,
  Smartphone,
  Store
} from 'lucide-react';

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
          <Link to="/" className="p-2 -ml-2 hover:bg-secondary/50 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <h1 className="flex-1 text-center font-semibold text-foreground pr-7">
            {t('about.title')}
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {/* Hero Section - Mission */}
        <section className="relative h-[400px] overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&q=80')`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
          <div className="relative h-full flex flex-col justify-end p-6 animate-fade-in">
            <span className="inline-block w-fit px-3 py-1 bg-accent text-accent-foreground text-xs font-semibold rounded-full mb-3">
              {t('about.mission.badge')}
            </span>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {t('about.mission.title')}
            </h2>
            <p className="text-muted-foreground">
              {t('about.mission.subtitle')}
            </p>
          </div>
        </section>

        {/* Challenge Section */}
        <section className="px-6 py-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {t('about.challenge.title')}
            </h3>
          </div>
          
          <Card className="bg-secondary/30 border-0 rounded-2xl overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground mb-2">
                    {t('about.challenge.cardTitle')}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t('about.challenge.cardText')}
                  </p>
                </div>
                <div className="w-16 h-16 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Store className="h-8 w-8 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA Button */}
        <div className="px-6 pb-8 animate-fade-in">
          <Link to="/signup">
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12 rounded-xl text-base font-semibold">
              {t('about.cta')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Solution Section */}
        <section className="bg-secondary/30 px-6 py-8 animate-fade-in">
          <div className="relative h-48 rounded-2xl overflow-hidden mb-6">
            <img 
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80"
              alt="Mobile payment"
              className="w-full h-full object-cover"
            />
          </div>
          
          <h3 className="text-xl font-bold text-foreground mb-3">
            {t('about.solution.title')}
          </h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {t('about.solution.description')}
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Smartphone className="h-5 w-5 text-accent" />
              </div>
              <p className="text-sm text-foreground pt-2">
                {t('about.solution.feature1')}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Store className="h-5 w-5 text-accent" />
              </div>
              <p className="text-sm text-foreground pt-2">
                {t('about.solution.feature2')}
              </p>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="px-6 py-8 animate-fade-in">
          <h3 className="text-xl font-bold text-foreground mb-6">
            {t('about.values.title')}
          </h3>
          
          <div className="space-y-4">
            {/* Security */}
            <Card className="bg-card border border-border rounded-2xl">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">
                    {t('about.values.security.title')}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t('about.values.security.description')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Proximity */}
            <Card className="bg-card border border-border rounded-2xl">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Signal className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">
                    {t('about.values.proximity.title')}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t('about.values.proximity.description')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Innovation */}
            <Card className="bg-card border border-border rounded-2xl">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">
                    {t('about.values.innovation.title')}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t('about.values.innovation.description')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Bottom spacing */}
        <div className="h-8" />
      </main>
    </div>
  );
};

export default About;
