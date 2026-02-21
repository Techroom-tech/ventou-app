import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEmailProviders } from '@/hooks/useEmailProviders';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Settings, Loader2 } from 'lucide-react';

const ALL_DRIVERS = [
  { driver: 'sendgrid', label: 'SendGrid' },
  { driver: 'resend', label: 'Resend' },
  { driver: 'mailersend', label: 'MailerSend' },
  { driver: 'mailgun', label: 'Mailgun' },
  { driver: 'postmark', label: 'Postmark' },
  { driver: 'sendinblue', label: 'Sendinblue (Brevo)' },
  { driver: 'ses', label: 'Amazon SES' },
  { driver: 'smtp', label: 'SMTP' },
  { driver: 'mailchimp', label: 'Mailchimp (Mandrill)' },
];

export default function AdminEmailProviders() {
  const { data: providers = [], isLoading, activateProvider } = useEmailProviders();
  const navigate = useNavigate();

  const getProviderForDriver = (driver: string) => providers.find(p => p.driver === driver);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/settings/email')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Configuration Email</h1>
            <p className="text-sm text-muted-foreground">Un seul fournisseur actif à la fois</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">SL</TableHead>
                    <TableHead>Méthode Email</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ALL_DRIVERS.map((d, i) => {
                    const prov = getProviderForDriver(d.driver);
                    return (
                      <TableRow key={d.driver}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{d.label}</TableCell>
                        <TableCell>
                          {prov?.is_active ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Actif
                            </Badge>
                          ) : prov ? (
                            <Badge variant="secondary">Configuré</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Non configuré</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {prov && !prov.is_active && (
                            <Button size="sm" variant="outline" onClick={() => activateProvider.mutate(prov.id)}>
                              Définir par défaut
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => navigate(`/admin/settings/email/providers/${d.driver}`)}>
                            <Settings className="h-4 w-4 mr-1" /> Configurer
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
