import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Bug, Lightbulb, Star, HelpCircle, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const TYPE_META: Record<string, { label: string; icon: typeof Bug; color: string }> = {
  bug: { label: 'Bug', icon: Bug, color: 'text-red-500' },
  feature: { label: 'Fonctionnalité', icon: Lightbulb, color: 'text-amber-500' },
  feedback: { label: 'Feedback', icon: Star, color: 'text-blue-500' },
  question: { label: 'Question', icon: HelpCircle, color: 'text-violet-500' },
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  open: 'default',
  review: 'secondary',
  planned: 'outline',
  resolved: 'secondary',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert',
  review: 'En revue',
  planned: 'Planifié',
  resolved: 'Résolu',
};

export default function AdminFeedback() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selected, setSelected] = useState<any>(null);

  const { data: feedbacks, isLoading } = useQuery({
    queryKey: ['admin-feedbacks', filterType, filterStatus],
    queryFn: async () => {
      let q = supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filterType !== 'all') q = q.eq('type', filterType);
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('feedbacks').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedbacks'] });
      toast({ title: 'Statut mis à jour' });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Feedback</h1>
            {feedbacks && (
              <Badge variant="secondary" className="ml-2">{feedbacks.length}</Badge>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="bug">🐞 Bug</SelectItem>
              <SelectItem value="feature">💡 Fonctionnalité</SelectItem>
              <SelectItem value="feedback">⭐ Feedback</SelectItem>
              <SelectItem value="question">❓ Question</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="open">Ouvert</SelectItem>
              <SelectItem value="review">En revue</SelectItem>
              <SelectItem value="planned">Planifié</SelectItem>
              <SelectItem value="resolved">Résolu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-xl overflow-hidden bg-card">
          <Table>
             <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead className="w-[70px] text-center">Votes</TableHead>
                <TableHead className="hidden md:table-cell">Page</TableHead>
                <TableHead className="hidden lg:table-cell">Appareil</TableHead>
                <TableHead className="w-[140px]">Date</TableHead>
                <TableHead className="w-[130px]">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : feedbacks?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Aucun feedback trouvé
                  </TableCell>
                </TableRow>
              ) : (
                feedbacks?.map((fb: any) => {
                  const meta = TYPE_META[fb.type] || TYPE_META.feedback;
                  const Icon = meta.icon;
                  return (
                    <TableRow
                      key={fb.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelected(fb)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-4 w-4 ${meta.color}`} />
                          <span className="text-xs">{meta.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {fb.title}
                        {fb.screenshot_url && <ImageIcon className="inline h-3 w-3 ml-1 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[180px] truncate">
                        {fb.page_url?.replace(/^https?:\/\/[^/]+/, '') || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {fb.device} / {fb.browser}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(fb.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={fb.status}
                          onValueChange={(s) => updateStatus.mutate({ id: fb.id, status: s })}
                        >
                          <SelectTrigger className="h-7 text-xs w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_LABELS).map(([v, l]) => (
                              <SelectItem key={v} value={v}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected && TYPE_META[selected.type] && (
                <span>{TYPE_META[selected.type].color === 'text-red-500' ? '🐞' : TYPE_META[selected.type].color === 'text-amber-500' ? '💡' : TYPE_META[selected.type].color === 'text-blue-500' ? '⭐' : '❓'}</span>
              )}
              {selected?.title}
            </DialogTitle>
            <DialogDescription>
              {selected && format(new Date(selected.created_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm whitespace-pre-wrap">{selected.message}</p>

              {selected.screenshot_url && (
                <a href={selected.screenshot_url} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={selected.screenshot_url} alt="Screenshot" className="rounded-lg border max-h-64 object-contain w-full" />
                </a>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div><strong>User ID:</strong> {selected.user_id?.slice(0, 8)}...</div>
                <div><strong>Store ID:</strong> {selected.store_id?.slice(0, 8) || '—'}...</div>
                <div><strong>Appareil:</strong> {selected.device}</div>
                <div><strong>Navigateur:</strong> {selected.browser}</div>
                {selected.page_url && (
                  <div className="col-span-2 flex items-center gap-1">
                    <strong>Page:</strong>
                    <a href={selected.page_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 truncate">
                      {selected.page_url.replace(/^https?:\/\/[^/]+/, '')}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Statut :</span>
                <Select
                  value={selected.status}
                  onValueChange={(s) => {
                    updateStatus.mutate({ id: selected.id, status: s });
                    setSelected({ ...selected, status: s });
                  }}
                >
                  <SelectTrigger className="h-8 w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
