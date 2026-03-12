import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ThumbsUp, Lightbulb, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert',
  review: 'En revue',
  planned: 'Planifié',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-muted text-muted-foreground',
  review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  planned: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export default function Ideas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [sortBy, setSortBy] = useState<'votes' | 'recent'>('votes');

  // Fetch feature requests (excluding resolved)
  const { data: ideas, isLoading } = useQuery({
    queryKey: ['ideas', sortBy],
    queryFn: async () => {
      const q = supabase
        .from('feedbacks')
        .select('id, title, message, votes_count, status, created_at')
        .eq('type', 'feature')
        .neq('status', 'resolved')
        .order(sortBy === 'votes' ? 'votes_count' : 'created_at', { ascending: false })
        .limit(100);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch current user's votes
  const { data: userVotes } = useQuery({
    queryKey: ['my-votes', user?.id],
    queryFn: async () => {
      if (!user?.id) return new Set<string>();
      const { data, error } = await supabase
        .from('feedback_votes')
        .select('feedback_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return new Set((data || []).map((v: any) => v.feedback_id));
    },
    enabled: !!user?.id,
  });

  const voteMutation = useMutation({
    mutationFn: async ({ feedbackId, hasVoted }: { feedbackId: string; hasVoted: boolean }) => {
      if (hasVoted) {
        const { error } = await supabase
          .from('feedback_votes')
          .delete()
          .eq('feedback_id', feedbackId)
          .eq('user_id', user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('feedback_votes')
          .insert({ feedback_id: feedbackId, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['my-votes'] });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de voter. Réessayez.', variant: 'destructive' });
    },
  });

  const handleVote = (feedbackId: string, hasVoted: boolean) => {
    if (!user) {
      toast({ title: 'Connexion requise', description: 'Connectez-vous pour voter.' });
      return;
    }
    voteMutation.mutate({ feedbackId, hasVoted });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Idées & Suggestions</h1>
            <p className="text-sm text-muted-foreground">Votez pour les fonctionnalités que vous souhaitez voir sur Ventou</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={sortBy === 'votes' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('votes')}
          >
            <ThumbsUp className="h-4 w-4 mr-1" />
            Populaire
          </Button>
          <Button
            variant={sortBy === 'recent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('recent')}
          >
            Récent
          </Button>
        </div>
      </div>

      {/* Ideas list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : ideas?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg">Aucune idée pour le moment</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Soumettez vos suggestions via le bouton feedback en bas à droite !
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ideas?.map((idea: any) => {
            const hasVoted = userVotes?.has(idea.id) ?? false;
            return (
              <Card
                key={idea.id}
                className="transition-all hover:shadow-md"
              >
                <CardContent className="flex items-start gap-4 p-4">
                  {/* Vote button */}
                  <button
                    onClick={() => handleVote(idea.id, hasVoted)}
                    disabled={voteMutation.isPending}
                    className={cn(
                      'flex flex-col items-center gap-1 min-w-[56px] py-2 px-3 rounded-xl border transition-all',
                      hasVoted
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/50 hover:text-primary'
                    )}
                  >
                    <ThumbsUp className={cn('h-5 w-5', hasVoted && 'fill-current')} />
                    <span className="text-sm font-semibold">{idea.votes_count}</span>
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{idea.title}</h3>
                      {idea.status && idea.status !== 'open' && (
                        <Badge
                          variant="secondary"
                          className={cn('text-[10px] px-1.5 py-0', STATUS_COLORS[idea.status])}
                        >
                          {STATUS_LABELS[idea.status] || idea.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {idea.message}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
