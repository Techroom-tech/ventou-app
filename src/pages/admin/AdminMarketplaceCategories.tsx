import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, GripVertical, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image_url: string | null;
  banner_url: string | null;
  banner_title: string | null;
  banner_link: string | null;
  position: number;
  is_active: boolean;
}

export default function AdminMarketplaceCategories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MarketplaceCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [form, setForm] = useState({ name: "", slug: "", icon: "Package", image_url: "", banner_url: "", banner_title: "", banner_link: "", position: 0, is_active: true });

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_categories")
      .select("*")
      .order("position", { ascending: true });
    if (error) console.error(error);
    setCategories((data ?? []) as MarketplaceCategory[]);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", slug: "", icon: "Package", image_url: "", banner_url: "", banner_title: "", banner_link: "", position: categories.length, is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (cat: MarketplaceCategory) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || "Package",
      image_url: cat.image_url || "",
      banner_url: cat.banner_url || "",
      banner_title: cat.banner_title || "",
      banner_link: cat.banner_link || "",
      position: cat.position,
      is_active: cat.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Le nom est requis", variant: "destructive" }); return; }
    const slug = form.slug || generateSlug(form.name);
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      slug,
      icon: form.icon || "Package",
      image_url: form.image_url || null,
      banner_url: form.banner_url || null,
      banner_title: form.banner_title || null,
      banner_link: form.banner_link || null,
      position: form.position,
      is_active: form.is_active,
    };

    if (editing) {
      const { error } = await supabase.from("marketplace_categories").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Catégorie mise à jour" });
    } else {
      const { error } = await supabase.from("marketplace_categories").insert(payload);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Catégorie créée" });
    }

    setSaving(false);
    setDialogOpen(false);
    fetchCategories();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("marketplace_categories").delete().eq("id", deleteId);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Catégorie supprimée" }); }
    setDeleteId(null);
    fetchCategories();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Catégories Marketplace</h1>
            <p className="text-muted-foreground text-sm">Gérez les catégories globales de la marketplace</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : categories.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune catégorie. Créez-en une !</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <Card key={cat.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center gap-4 py-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt="" className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">/{cat.slug} · Position {cat.position}</p>
                  </div>
                  <Switch checked={cat.is_active} onCheckedChange={async (checked) => {
                    await supabase.from("marketplace_categories").update({ is_active: checked }).eq("id", cat.id);
                    fetchCategories();
                  }} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(cat.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || generateSlug(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="font-mono text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icône Lucide</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Package" />
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Image URL (optionnel)</Label>
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Banner URL (catégorie page)</Label>
              <Input value={form.banner_url} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Titre banner</Label>
                <Input value={form.banner_title} onChange={(e) => setForm({ ...form, banner_title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Lien banner</Label>
                <Input value={form.banner_link} onChange={(e) => setForm({ ...form, banner_link: e.target.value })} />
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
        title="Supprimer cette catégorie ?"
        description="Cette action est irréversible. Les produits liés ne seront pas supprimés."
        onConfirm={handleDelete}
      />
    </AdminLayout>
  );
}
