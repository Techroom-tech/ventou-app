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
        <div className="max-w-6xl mx-auto px-4 md:px-8 lg:px-16 h-14 flex items-center">
          <Link to="/" className="p-2 -ml-2 hover:bg-secondary/50 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <h1 className="flex-1 text-center font-semibold text-foreground pr-7">
            {t('about.title')}
          </h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Hero Section - Mission */}
        <section className="relative h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=1200&q=80')`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
          <div className="relative h-full flex flex-col justify-end p-6 md:p-12 lg:p-16 animate-fade-in max-w-3xl">
            <span className="inline-block w-fit px-3 py-1 bg-accent text-accent-foreground text-xs md:text-sm font-semibold rounded-full mb-3 md:mb-4">
              {t('about.mission.badge')}
            </span>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-foreground mb-2 md:mb-4">
              {t('about.mission.title')}
            </h2>
            <p className="text-muted-foreground md:text-lg lg:text-xl">
              {t('about.mission.subtitle')}
            </p>
          </div>
        </section>

        {/* Challenge Section + CTA */}
        <section className="px-6 md:px-12 lg:px-16 py-8 md:py-12 animate-fade-in">
          <div className="grid md:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-center">
            {/* Challenge */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-accent" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-foreground">
                  {t('about.challenge.title')}
                </h3>
              </div>
              
              <Card className="bg-secondary/30 border-0 rounded-2xl overflow-hidden">
                <CardContent className="p-5 md:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-2 md:text-lg">
                        {t('about.challenge.cardTitle')}
                      </h4>
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                        {t('about.challenge.cardText')}
                      </p>
                    </div>
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Store className="h-8 w-8 md:h-10 md:w-10 text-accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CTA Button */}
            <div className="flex items-center">
              <Link to="/signup" className="w-full md:w-auto">
                <Button className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground h-12 md:h-14 px-8 rounded-xl text-base md:text-lg font-semibold">
                  {t('about.cta')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="bg-secondary/30 px-6 md:px-12 lg:px-16 py-8 md:py-12 animate-fade-in">
          <div className="grid md:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-center">
            {/* Image */}
            <div className="relative h-48 md:h-64 lg:h-80 rounded-2xl overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80"
                alt="Mobile payment"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Content */}
            <div>
              <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-3 md:mb-4">
                {t('about.solution.title')}
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed md:text-lg">
                {t('about.solution.description')}
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Smartphone className="h-5 w-5 md:h-6 md:w-6 text-accent" />
                  </div>
                  <p className="text-sm md:text-base text-foreground pt-2">
                    {t('about.solution.feature1')}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Store className="h-5 w-5 md:h-6 md:w-6 text-accent" />
                  </div>
                  <p className="text-sm md:text-base text-foreground pt-2">
                    {t('about.solution.feature2')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="px-6 md:px-12 lg:px-16 py-8 md:py-12 animate-fade-in">
          <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-6 md:mb-8">
            {t('about.values.title')}
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Security */}
            <Card className="bg-card border border-border rounded-2xl">
              <CardContent className="p-4 md:p-6 flex items-center gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 md:h-7 md:w-7 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground md:text-lg">
                    {t('about.values.security.title')}
                  </h4>
                  <p className="text-sm md:text-base text-muted-foreground">
                    {t('about.values.security.description')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Proximity */}
            <Card className="bg-card border border-border rounded-2xl">
              <CardContent className="p-4 md:p-6 flex items-center gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Signal className="h-6 w-6 md:h-7 md:w-7 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground md:text-lg">
                    {t('about.values.proximity.title')}
                  </h4>
                  <p className="text-sm md:text-base text-muted-foreground">
                    {t('about.values.proximity.description')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Innovation */}
            <Card className="bg-card border border-border rounded-2xl md:col-span-2 lg:col-span-1">
              <CardContent className="p-4 md:p-6 flex items-center gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="h-6 w-6 md:h-7 md:w-7 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground md:text-lg">
                    {t('about.values.innovation.title')}
                  </h4>
                  <p className="text-sm md:text-base text-muted-foreground">
                    {t('about.values.innovation.description')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Bottom spacing */}
        <div className="h-8 md:h-12" />
      </main>
    </div>
  );
};

export default About;
