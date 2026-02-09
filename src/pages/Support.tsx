import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MessageSquare, Mail, FileText, Clock, Send, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { LanguageToggle } from '@/components/LanguageToggle';

const contactFormSchema = z.object({
  name: z.string().min(2, { message: 'Le nom doit contenir au moins 2 caractères' }),
  email: z.string().email({ message: 'Adresse email invalide' }),
  subject: z.string().min(1, { message: 'Veuillez sélectionner un sujet' }),
  message: z.string().min(10, { message: 'Le message doit contenir au moins 10 caractères' }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const Support = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
  });

  const onSubmit = (data: ContactFormValues) => {
    console.log('Form submitted:', data);
    toast({
      title: t('support.form.success'),
      description: t('support.form.successDescription'),
    });
    form.reset();
  };

  const handleWhatsApp = () => {
    window.open('https://wa.me/22100000000', '_blank');
  };

  const handleEmail = () => {
    window.location.href = 'mailto:support@ventou.shop';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">V</span>
            </div>
            <span className="text-lg font-bold text-foreground">VENTOU</span>
          </Link>
          <h1 className="text-lg font-semibold text-foreground">{t('support.title')}</h1>
          <LanguageToggle />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-6 md:py-10">
        {/* Hero Section */}
        <section className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
            <span className="text-foreground">{t('support.hero.title1')}</span>{' '}
            <span className="text-primary">{t('support.hero.title2')}</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base lg:text-lg max-w-2xl mx-auto">
            {t('support.hero.subtitle')}
          </p>
        </section>

        {/* Contact Cards */}
        <section className="mb-6 md:mb-8">
          {/* WhatsApp Card - Full Width */}
          <Card
            className="mb-4 cursor-pointer hover:shadow-md transition-shadow border-primary/30 bg-primary/5"
            onClick={handleWhatsApp}
          >
            <CardContent className="p-4 md:p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-primary rounded-xl flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 md:h-7 md:w-7 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-base md:text-lg">
                    {t('support.contact.whatsapp.title')}
                  </h3>
                  <p className="text-muted-foreground text-sm md:text-base">
                    {t('support.contact.whatsapp.subtitle')}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
            </CardContent>
          </Card>

          {/* Email & Help Center - Side by Side */}
          <div className="grid grid-cols-2 gap-4">
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={handleEmail}
            >
              <CardContent className="p-4 md:p-6 flex flex-col items-center text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                  <Mail className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm md:text-base">
                  {t('support.contact.email.title')}
                </h3>
                <p className="text-muted-foreground text-xs md:text-sm">
                  {t('support.contact.email.subtitle')}
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 md:p-6 flex flex-col items-center text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                  <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm md:text-base">
                  {t('support.contact.helpCenter.title')}
                </h3>
                <p className="text-muted-foreground text-xs md:text-sm">
                  {t('support.contact.helpCenter.subtitle')}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Availability Banner */}
        <section className="mb-8 md:mb-10">
          <div className="flex items-center justify-center gap-2 text-sm md:text-base text-muted-foreground bg-secondary/50 rounded-lg py-3 px-4">
            <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <span>{t('support.availability')}</span>
          </div>
        </section>

        {/* Form & FAQ Section - Side by Side on Desktop */}
        <section className="grid md:grid-cols-2 gap-6 md:gap-8 lg:gap-12">
          {/* Contact Form */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 bg-primary rounded-full" />
              <h3 className="text-lg md:text-xl font-semibold text-foreground">
                {t('support.form.title')}
              </h3>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('support.form.name')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('support.form.namePlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('support.form.email')}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t('support.form.emailPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('support.form.subject')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder={t('support.form.subjectPlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="order">{t('support.form.subjects.order')}</SelectItem>
                          <SelectItem value="payment">{t('support.form.subjects.payment')}</SelectItem>
                          <SelectItem value="account">{t('support.form.subjects.account')}</SelectItem>
                          <SelectItem value="seller">{t('support.form.subjects.seller')}</SelectItem>
                          <SelectItem value="other">{t('support.form.subjects.other')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('support.form.message')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('support.form.messagePlaceholder')}
                          className="min-h-[120px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  {t('support.form.submit')}
                </Button>
              </form>
            </Form>
          </div>

          {/* FAQ Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg md:text-xl font-semibold text-foreground">
                {t('support.faq.title')}
              </h3>
              <Link
                to="/faq"
                className="text-sm text-primary hover:underline"
              >
                {t('support.faq.seeAll')}
              </Link>
            </div>

            <Accordion type="single" collapsible className="space-y-2">
              <AccordionItem value="q1" className="border rounded-lg px-4">
                <AccordionTrigger className="text-left text-sm md:text-base hover:no-underline">
                  {t('support.faq.q1.question')}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  {t('support.faq.q1.answer')}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="q2" className="border rounded-lg px-4">
                <AccordionTrigger className="text-left text-sm md:text-base hover:no-underline">
                  {t('support.faq.q2.question')}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  {t('support.faq.q2.answer')}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="q3" className="border rounded-lg px-4">
                <AccordionTrigger className="text-left text-sm md:text-base hover:no-underline">
                  {t('support.faq.q3.question')}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  {t('support.faq.q3.answer')}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Support;
