import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { EmailJumpToMenu } from '@/components/admin/EmailJumpToMenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useEmailDomains } from '@/hooks/useEmailDomains';
import { Plus, Trash2, CheckCircle2, Clock, XCircle, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_MAP: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'En attente' },
  verified: { icon: CheckCircle2, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', label: 'Vérifié' },
  failed: { icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', label: 'Échoué' },
};

export default function AdminEmailDomains() {
  const { data: domains = [], isLoading, addDomain, verifyDomain, deleteDomain } = useEmailDomains();
  const [newDomain, setNewDomain] = useState('');

  const handleAdd = () => {
    if (!newDomain.trim()) { toast.error('Entrez un domaine'); return; }
    addDomain.mutate(newDomain.trim());
    setNewDomain('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié !');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">
            Dashboard / Settings / <span className="text-foreground font-medium">Authentification Domaine</span>
          </p>
          <h1 className="text-xl font-semibold text-foreground mt-2">Authentification Domaine</h1>
          <p className="text-sm text-muted-foreground">DKIM, SPF et vérification DNS</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <EmailJumpToMenu />

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Ajouter un domaine</CardTitle></CardHeader>
              <CardContent className="flex gap-3">
                <Input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="example.com" className="max-w-sm" />
                <Button onClick={handleAdd} disabled={addDomain.isPending}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter
                </Button>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : domains.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun domaine configuré</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {domains.map(d => {
                  const st = STATUS_MAP[d.verification_status] || STATUS_MAP.pending;
                  const Icon = st.icon;
                  return (
                    <Card key={d.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-foreground">{d.domain}</span>
                            <Badge className={st.color}><Icon className="h-3 w-3 mr-1" />{st.label}</Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => verifyDomain.mutate(d.id)} disabled={d.verification_status === 'verified'}>
                              Vérifier
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteDomain.mutate(d.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {d.spf_record && (
                          <div>
                            <Label className="text-xs font-semibold">SPF Record (TXT)</Label>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded flex-1 overflow-x-auto">{d.spf_record}</code>
                              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(d.spf_record!)}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                        {d.dkim_record && (
                          <div>
                            <Label className="text-xs font-semibold">DKIM Record (TXT)</Label>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded flex-1 overflow-x-auto">{d.dkim_record}</code>
                              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(d.dkim_record!)}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
