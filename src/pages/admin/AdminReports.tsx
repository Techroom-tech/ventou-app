import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminReports } from '@/hooks/useAdminReports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Flag, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function AdminReports() {
  const { reports, isLoading, resolveReport } = useAdminReports();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = statusFilter === 'all'
    ? reports
    : reports.filter((r: any) => r.status === statusFilter);

  if (isLoading) {
    return <AdminLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Flag className="h-6 w-6" /> Centre de modération
          </h1>
          <p className="text-sm text-muted-foreground">{reports.length} signalement(s) (6 derniers mois)</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="reviewed">Examiné</SelectItem>
                  <SelectItem value="ignored">Ignoré</SelectItem>
                  <SelectItem value="actioned">Action prise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Raison</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{r.target_type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{r.reason}</TableCell>
                    <TableCell>
                      <Badge
                        variant={r.status === 'pending' ? 'secondary' : r.status === 'actioned' ? 'destructive' : 'default'}
                        className="capitalize"
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === 'pending' && (
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => resolveReport(r.id, 'ignored')}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => resolveReport(r.id, 'reviewed')}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => resolveReport(r.id, 'actioned', 'Action admin')}>
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun signalement</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
