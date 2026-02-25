import { AdminLayout } from '@/components/admin/AdminLayout';
import { EmailJumpToMenu } from '@/components/admin/EmailJumpToMenu';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEmailProviders } from '@/hooks/useEmailProviders';
import { useNavigate } from 'react-router-dom';
import { Pencil, ChevronDown, Loader2 } from 'lucide-react';

const DRIVERS = [
  { driver: 'mailchimp', label: 'Mailchimp' },
  { driver: 'mailersend', label: 'Mailersend' },
  { driver: 'mailgun', label: 'Mailgun' },
  { driver: 'postmark', label: 'Postmark' },
  { driver: 'sendgrid', label: 'Sendgrid' },
  { driver: 'sendinblue', label: 'Sendinblue' },
  { driver: 'ses', label: 'SES' },
  { driver: 'smtp', label: 'SMTP' },
];

export default function AdminEmailProviders() {
  const { data: providers = [], isLoading } = useEmailProviders();
  const navigate = useNavigate();

  const getProvider = (driver: string) => providers.find(p => p.driver === driver);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div>
          <p className="text-sm text-muted-foreground">
            Dashboard / Settings / <span className="text-foreground font-medium">Email Configuration</span>
          </p>
          <h1 className="text-xl font-semibold text-foreground mt-2">Email Configuration</h1>
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <EmailJumpToMenu />

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14 pl-6">SL</TableHead>
                      <TableHead>Email Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DRIVERS.map((d, i) => {
                      const prov = getProvider(d.driver);
                      const active = prov?.is_active === true;
                      return (
                        <TableRow key={d.driver} className="hover:bg-primary/5">
                          <TableCell className="pl-6 font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium text-foreground">{d.label}</TableCell>
                          <TableCell>
                            {active ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                Inactive
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => navigate(`/admin/settings/email/providers/${d.driver}`)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
