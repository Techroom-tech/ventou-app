import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminSubscriptions } from '@/hooks/useAdminSubscriptions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, MoreHorizontal, CreditCard } from 'lucide-react';

export default function AdminSubscriptions() {
  const { plans, subscriptions, isLoading, changePlan, cancelSubscription, resetTrial } = useAdminSubscriptions();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = statusFilter === 'all'
    ? subscriptions
    : subscriptions.filter((s: any) => s.status === statusFilter);

  if (isLoading) {
    return <AdminLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6" /> Abonnements
          </h1>
          <p className="text-sm text-muted-foreground">{subscriptions.length} abonnement(s)</p>
        </div>

        {/* Plans overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan: any) => (
            <Card key={plan.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{plan.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{plan.price_monthly.toLocaleString('fr-FR')} FCFA/mois</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max {plan.max_stores} boutique(s) · {plan.max_products} produits
                </p>
                {plan.requires_approval && (
                  <Badge variant="secondary" className="mt-2 text-xs">Approbation requise</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Subscriptions table */}
        <Card>
          <CardHeader className="pb-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="trial">Essai</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="expired">Expiré</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Fin essai</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell className="text-sm">{sub.user_id.slice(0, 12)}...</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{sub.plan_id}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={sub.status === 'active' ? 'default' : sub.status === 'trial' ? 'secondary' : 'destructive'}
                        className="capitalize"
                      >
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.trial_ends_at ? new Date(sub.trial_ends_at).toLocaleDateString('fr-FR') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {plans.map((plan: any) => (
                            <DropdownMenuItem key={plan.id} onClick={() => changePlan(sub.user_id, plan.id)}>
                              Passer au {plan.name}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem onClick={() => resetTrial(sub.user_id)}>Reset essai</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => cancelSubscription(sub.user_id)} className="text-destructive">
                            Annuler
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun abonnement</TableCell>
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
