import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, RefreshCw, Bug, CheckCircle2, XCircle, AlertTriangle, ShieldAlert, Store } from 'lucide-react';

// Types
interface ShopCreationLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string | null;
}

interface DiagnosticEntry {
  id: string;
  created_at: string;
  user_id: string;
  subdomain: string;
  normalized_slug: string;
  success: boolean;
  error_code: string | null;
  stores_count: number | null;
  store_limit: number | null;
}

const ERROR_CODE_CONFIG: Record<string, { label: string; color: string; icon: typeof XCircle }> = {
  SUBDOMAIN_TAKEN: { label: 'Sous-domaine pris', color: 'destructive', icon: XCircle },
  STORE_LIMIT_REACHED: { label: 'Limite atteinte', color: 'secondary', icon: ShieldAlert },
  INVALID_SUBDOMAIN: { label: 'Slug invalide', color: 'outline', icon: AlertTriangle },
  INTERNAL_ERROR: { label: 'Erreur interne', color: 'destructive', icon: Bug },
  AUTH_REQUIRED: { label: 'Non authentifié', color: 'outline', icon: ShieldAlert },
  SUCCESS: { label: 'Succès', color: 'default', icon: CheckCircle2 },
};

function ErrorCodeBadge({ code }: { code: string | null }) {
  const key = code || 'SUCCESS';
  const config = ERROR_CODE_CONFIG[key] || { label: key, color: 'outline', icon: AlertTriangle };
  const Icon = config.icon;

  return (
    <Badge variant={config.color as any} className="gap-1 text-xs">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export default function AdminShopDiagnostic() {
  const [search, setSearch] = useState('');
  const [filterCode, setFilterCode] = useState<string>('all');

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-shop-diagnostic'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('action', 'shop_creation_attempt')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data ?? []) as ShopCreationLog[];
    },
  });

  // Transform logs to diagnostic entries
  const entries: DiagnosticEntry[] = (logs ?? []).map((log) => {
    const d = (log.details ?? {}) as Record<string, unknown>;
    return {
      id: log.id,
      created_at: log.created_at ?? '',
      user_id: d.user_id as string ?? log.admin_id,
      subdomain: d.subdomain as string ?? '-',
      normalized_slug: d.normalized_slug as string ?? '-',
      success: d.success as boolean ?? false,
      error_code: d.error_code as string | null ?? null,
      stores_count: d.stores_count as number | null ?? null,
      store_limit: d.store_limit as number | null ?? null,
    };
  });

  // Filter
  const filtered = entries.filter((e) => {
    if (filterCode !== 'all') {
      if (filterCode === 'SUCCESS' && e.error_code !== null) return false;
      if (filterCode !== 'SUCCESS' && e.error_code !== filterCode) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        e.subdomain?.toLowerCase().includes(q) ||
        e.normalized_slug?.toLowerCase().includes(q) ||
        e.user_id?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Stats
  const totalAttempts = entries.length;
  const successCount = entries.filter((e) => e.success).length;
  const subdomainTaken = entries.filter((e) => e.error_code === 'SUBDOMAIN_TAKEN').length;
  const limitReached = entries.filter((e) => e.error_code === 'STORE_LIMIT_REACHED').length;
  const invalidSlug = entries.filter((e) => e.error_code === 'INVALID_SUBDOMAIN').length;
  const internalErrors = entries.filter((e) => e.error_code === 'INTERNAL_ERROR').length;

  const stats = [
    { label: 'Tentatives', value: totalAttempts, icon: Store },
    { label: 'Succès', value: successCount, icon: CheckCircle2 },
    { label: 'Slug pris', value: subdomainTaken, icon: XCircle },
    { label: 'Limite plan', value: limitReached, icon: ShieldAlert },
    { label: 'Slug invalide', value: invalidSlug, icon: AlertTriangle },
    { label: 'Erreurs', value: internalErrors, icon: Bug },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bug className="h-6 w-6 text-accent" />
              Diagnostic création boutique
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visualisez les tentatives de création et identifiez les erreurs récurrentes
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold mt-1">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par slug, user ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterCode} onValueChange={setFilterCode}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Tous les codes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les codes</SelectItem>
                  <SelectItem value="SUCCESS">✓ Succès</SelectItem>
                  <SelectItem value="SUBDOMAIN_TAKEN">✗ Sous-domaine pris</SelectItem>
                  <SelectItem value="STORE_LIMIT_REACHED">⚠ Limite atteinte</SelectItem>
                  <SelectItem value="INVALID_SUBDOMAIN">⚠ Slug invalide</SelectItem>
                  <SelectItem value="INTERNAL_ERROR">✗ Erreur interne</SelectItem>
                  <SelectItem value="AUTH_REQUIRED">✗ Non authentifié</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bug className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucune tentative de création trouvée</p>
                <p className="text-xs mt-1">Les logs apparaîtront automatiquement lorsque des vendeurs créeront des boutiques</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Date</TableHead>
                      <TableHead>Sous-domaine</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-center">Boutiques</TableHead>
                      <TableHead>User ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {entry.created_at
                            ? new Date(entry.created_at).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-mono text-sm">{entry.normalized_slug || entry.subdomain}</span>
                            {entry.normalized_slug && entry.subdomain !== entry.normalized_slug && (
                              <span className="text-xs text-muted-foreground ml-1">
                                (saisie: {entry.subdomain})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ErrorCodeBadge code={entry.success ? null : entry.error_code} />
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {entry.stores_count !== null && entry.store_limit !== null
                            ? `${entry.stores_count} / ${entry.store_limit}`
                            : '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground max-w-[120px] truncate">
                          {entry.user_id?.slice(0, 8) ?? '-'}...
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
