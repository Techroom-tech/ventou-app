import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";

interface Banner {
  id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  button_text: string | null;
  button_link: string | null;
  starts_at: string;
  ends_at: string | null;
  priority: number;
  is_active: boolean;
}

export default function AdminMarketplaceBanners() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    image_url: "", title: "", description: "", button_text: "Découvrir",
    button_link: "", starts_at: "", ends_at: "", priority: 0, is_active: true,
  });

  const fetchBanners = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_banners")
      .select("*")
      .order("priority", { ascending: false });
    if (error) console.error(error);
    setBanners((data ?? []) as Banner[]);
    setLoading(false);
  };

  useEffect(() => { fetchBanners(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ image_url: "", title: "", description: "", button_text: "Découvrir", button_link: "", starts_at: new Date().toISOString().slice(0, 16), ends_at: "", priority: 0, is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      image_url: b.image_url,
      title: b.title || "",
      description: b.description || "",
      button_text: b.button_text || "Découvrir",
      button_link: b.button_link || "",
      starts_at: b.starts_at ? new Date(b.starts_at).toISOString().slice(0, 16) : "",
      ends_at: b.ends_at ? new Date(b.ends_at).toISOString().slice(0, 16) : "",
      priority: b.priority,
      is_active: b.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.image_url.trim()) { toast({ title: "L'URL de l'image est requise", variant: "destructive" }); return; }
    setSaving(true);

    const payload = {
      image_url: form.image_url.trim(),
      title: form.title || null,
      description: form.description || null,
      button_text: form.button_text || "Découvrir",
      button_link: form.button_link || null,
      starts_at: form.starts_at || new Date().toISOString(),
      ends_at: form.ends_at || null,
      priority: form.priority,
      is_active: form.is_active,
    };

    if (editing) {
      const { error } = await supabase.from("marketplace_banners").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Banner mise à jour" });
    } else {
      const { error } = await supabase.from("marketplace_banners").insert(payload);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Banner créée" });
    }

    setSaving(false);
    setDialogOpen(false);
    fetchBanners();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("marketplace_banners").delete().eq("id", deleteId);
    toast({ title: "Banner supprimée" });
    setDeleteId(null);
    fetchBanners();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Banners Marketplace</h1>
            <p className="text-muted-foreground text-sm">Gérez les bannières du hero slider</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : banners.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune bannière.</CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {banners.map((b) => (
              <Card key={b.id} className="overflow-hidden">
                <div className="aspect-[3/1] bg-muted relative">
                  <img src={b.image_url} alt={b.title || ""} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Active" : "Inactive"}</Badge>
                    <Badge variant="outline">P{b.priority}</Badge>
                  </div>
                </div>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{b.title || "(Sans titre)"}</p>
                    <p className="text-xs text-muted-foreground truncate">{b.button_link || "Pas de lien"}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(b.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la bannière" : "Nouvelle bannière"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL Image *</Label>
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Texte bouton</Label>
                <Input value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Lien bouton</Label>
                <Input value={form.button_link} onChange={(e) => setForm({ ...form, button_link: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Début</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fin (optionnel)</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "..." : editing ? "Mettre à jour" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Supprimer cette bannière ?"
        description="Cette action est irréversible."
        onConfirm={handleDelete}
      />
    </AdminLayout>
  );
}
