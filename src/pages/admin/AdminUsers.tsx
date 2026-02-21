import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useAdminAuditLog } from '@/hooks/useAdminAuditLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Shield, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { AppRole } from '@/types/admin';

export default function AdminUsers() {
  const { isSuperAdmin } = useAdminRole();
  const { log } = useAdminAuditLog();
  const [search, setSearch] = useState('');

  const { data: roles = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('role');
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = roles.filter((r: any) =>
    r.user_id.includes(search) || r.role.includes(search.toLowerCase())
  );

  const addRole = async (userId: string, role: AppRole) => {
    if (!userId.trim()) return;
    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
    if (error) {
      toast.error(error.message);
      return;
    }
    await log({ action: 'add_role', target_type: 'user', target_id: userId, details: { role } });
    toast.success('Rôle ajouté');
    refetch();
  };

  const removeRole = async (id: string, userId: string, role: string) => {
    const { error } = await supabase.from('user_roles').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await log({ action: 'remove_role', target_type: 'user', target_id: userId, details: { role } });
    toast.success('Rôle supprimé');
    refetch();
  };

  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('vendor');

  if (isLoading) {
    return <AdminLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" /> Utilisateurs & Rôles
          </h1>
          <p className="text-sm text-muted-foreground">{roles.length} rôle(s) attribué(s)</p>
        </div>

        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4" /> Ajouter un rôle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-muted-foreground mb-1 block">User ID</label>
                  <Input
                    placeholder="UUID de l'utilisateur"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                  />
                </div>
                <div className="w-40">
                  <label className="text-xs text-muted-foreground mb-1 block">Rôle</label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => addRole(newUserId, newRole)} size="sm">
                  Ajouter
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Rôle</TableHead>
                  {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm font-mono">{r.user_id.slice(0, 16)}...</TableCell>
                    <TableCell>
                      <Badge className="capitalize">{r.role.replace('_', ' ')}</Badge>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeRole(r.id, r.user_id, r.role)}
                        >
                          Supprimer
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Aucun rôle</TableCell>
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
