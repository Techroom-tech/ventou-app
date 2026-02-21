import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminVendors } from '@/hooks/useAdminVendors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, Search, MoreHorizontal, Eye, Ban, RefreshCw, Store } from 'lucide-react';

export default function AdminVendors() {
  const navigate = useNavigate();
  const { vendors, isLoading, suspendVendor, reactivateVendor, resetTrial } = useAdminVendors();
  const [search, setSearch] = useState('');

  const filtered = vendors.filter((v) => {
    const name = `${v.first_name || ''} ${v.last_name || ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Vendeurs</h1>
            <p className="text-sm text-muted-foreground">{vendors.length} vendeur(s) enregistré(s)</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un vendeur..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendeur</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-center">Boutiques</TableHead>
                  <TableHead className="text-center">Risque</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {vendor.first_name || ''} {vendor.last_name || ''}
                      </div>
                      <div className="text-xs text-muted-foreground">{vendor.id.slice(0, 8)}...</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{vendor.plan_id}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={vendor.subscription_status === 'active' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {vendor.subscription_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{vendor.stores_count}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={vendor.risk_score === 'high' ? 'destructive' : vendor.risk_score === 'medium' ? 'secondary' : 'outline'}
                      >
                        {vendor.risk_score}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin/vendors/${vendor.id}`)}>
                            <Eye className="h-4 w-4 mr-2" /> Voir le profil
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => suspendVendor(vendor.id)}>
                            <Ban className="h-4 w-4 mr-2" /> Suspendre
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => reactivateVendor(vendor.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Réactiver
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resetTrial(vendor.id)}>
                            <Store className="h-4 w-4 mr-2" /> Reset essai
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucun vendeur trouvé
                    </TableCell>
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
