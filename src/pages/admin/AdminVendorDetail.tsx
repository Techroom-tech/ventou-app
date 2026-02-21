import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminVendors } from '@/hooks/useAdminVendors';
import { useAdminStores } from '@/hooks/useAdminStores';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Ban, RefreshCw, Store, Loader2 } from 'lucide-react';

export default function AdminVendorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { vendors, isLoading, suspendVendor, reactivateVendor, resetTrial } = useAdminVendors();
  const { stores } = useAdminStores();

  const vendor = vendors.find((v) => v.id === id);
  const vendorStores = stores.filter((s) => s.owner_id === id);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!vendor) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Vendeur introuvable</p>
          <Button variant="outline" onClick={() => navigate('/admin/vendors')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/vendors')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {vendor.first_name || ''} {vendor.last_name || ''}
            </h1>
            <p className="text-sm text-muted-foreground">ID: {vendor.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="capitalize">{vendor.plan_id}</Badge>
              <p className="text-xs text-muted-foreground mt-1">Statut: {vendor.subscription_status}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Boutiques</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{vendor.stores_count}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Risque</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={vendor.risk_score === 'high' ? 'destructive' : 'outline'}>
                {vendor.risk_score}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button variant="destructive" size="sm" onClick={() => suspendVendor(vendor.id)}>
            <Ban className="h-4 w-4 mr-2" /> Suspendre
          </Button>
          <Button variant="outline" size="sm" onClick={() => reactivateVendor(vendor.id)}>
            <RefreshCw className="h-4 w-4 mr-2" /> Réactiver
          </Button>
          <Button variant="outline" size="sm" onClick={() => resetTrial(vendor.id)}>
            Reset essai
          </Button>
        </div>

        {vendorStores.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Store className="h-4 w-4" /> Boutiques ({vendorStores.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {vendorStores.map((store) => (
                <div key={store.id} className="flex items-center justify-between p-3 rounded-md border">
                  <div>
                    <p className="font-medium text-foreground text-sm">{store.name}</p>
                    <p className="text-xs text-muted-foreground">{store.slug}</p>
                  </div>
                  <Badge variant={store.is_suspended ? 'destructive' : 'default'}>
                    {store.is_suspended ? 'Suspendue' : 'Active'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
