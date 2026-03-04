import { useState, useMemo } from 'react';
import { Star, Check, X, Trash2, MessageSquare } from 'lucide-react';
import { useShop } from '@/hooks/useShop';
import { useVendorReviews, useToggleReviewApproval, useDeleteReview } from '@/hooks/useVendorReviews';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { toast } from 'sonner';

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/30'}`} />
      ))}
    </div>
  );
}

export default function Reviews() {
  const { shop } = useShop();
  const { data: reviews = [], isLoading } = useVendorReviews(shop?.id);
  const toggleApproval = useToggleReviewApproval();
  const deleteReview = useDeleteReview();
  const [tab, setTab] = useState('all');

  const filtered = useMemo(() => {
    if (tab === 'pending') return reviews.filter(r => !r.is_approved);
    if (tab === 'approved') return reviews.filter(r => r.is_approved);
    return reviews;
  }, [reviews, tab]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const approved = reviews.filter(r => r.is_approved).length;
    const pending = total - approved;
    const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
    const distribution = [5, 4, 3, 2, 1].map(star => ({
      star,
      count: reviews.filter(r => r.rating === star).length,
      pct: total > 0 ? (reviews.filter(r => r.rating === star).length / total) * 100 : 0,
    }));
    return { total, approved, pending, avg, distribution };
  }, [reviews]);

  const handleApprove = async (id: string) => {
    await toggleApproval.mutateAsync({ reviewId: id, approved: true });
    toast.success('Avis approuvé');
  };

  const handleReject = async (id: string) => {
    await toggleApproval.mutateAsync({ reviewId: id, approved: false });
    toast.success('Avis rejeté');
  };

  const handleDelete = async (id: string) => {
    await deleteReview.mutateAsync(id);
    toast.success('Avis supprimé');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Avis clients</h1>
        <p className="text-sm text-muted-foreground">Gérez les avis de votre boutique</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Note moyenne</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{stats.avg > 0 ? stats.avg.toFixed(1) : '—'}</p>
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approuvés</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </CardContent>
        </Card>
      </div>

      {/* Rating distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Distribution des notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.distribution.map(d => (
            <div key={d.star} className="flex items-center gap-3">
              <span className="text-sm w-12 text-right">{d.star} ★</span>
              <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${d.pct}%` }} />
              </div>
              <span className="text-sm text-muted-foreground w-8">{d.count}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Reviews table */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Tous ({stats.total})</TabsTrigger>
          <TabsTrigger value="pending">En attente ({stats.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approuvés ({stats.approved})</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Chargement...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <MessageSquare className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">Aucun avis dans cette catégorie</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden md:table-cell">Produit</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="hidden md:table-cell">Avis</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(review => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {review.country && (
                            <img
                              src={`https://flagcdn.com/24x18/${review.country}.png`}
                              alt=""
                              className="w-5 h-3.5 rounded-sm"
                              loading="lazy"
                            />
                          )}
                          <div>
                            <p className="font-medium text-sm">{review.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(review.created_at), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm truncate max-w-[160px] block">{review.product_name}</span>
                      </TableCell>
                      <TableCell><RatingStars rating={review.rating} /></TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {review.review_text || '—'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={review.is_approved ? 'default' : 'secondary'}>
                          {review.is_approved ? 'Approuvé' : 'En attente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!review.is_approved && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600"
                              onClick={() => handleApprove(review.id)}
                              disabled={toggleApproval.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {review.is_approved && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-600"
                              onClick={() => handleReject(review.id)}
                              disabled={toggleApproval.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(review.id)}
                            disabled={deleteReview.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
