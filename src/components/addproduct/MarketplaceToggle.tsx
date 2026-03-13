import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Store } from "lucide-react";

interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  showInMarketplace: boolean;
  onShowInMarketplaceChange: (v: boolean) => void;
  marketplaceCategoryId: string | null;
  onMarketplaceCategoryIdChange: (v: string | null) => void;
}

export default function MarketplaceToggle({
  showInMarketplace,
  onShowInMarketplaceChange,
  marketplaceCategoryId,
  onMarketplaceCategoryIdChange,
}: Props) {
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);

  useEffect(() => {
    supabase
      .from("marketplace_categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("position")
      .then(({ data }) => {
        if (data) setCategories(data as MarketplaceCategory[]);
      });
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-muted-foreground" />
          <Label className="cursor-pointer">Publier dans la marketplace</Label>
        </div>
        <Switch checked={showInMarketplace} onCheckedChange={onShowInMarketplaceChange} />
      </div>
      {showInMarketplace && categories.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Catégorie marketplace</Label>
          <Select
            value={marketplaceCategoryId ?? "none"}
            onValueChange={(v) => onMarketplaceCategoryIdChange(v === "none" ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucune catégorie</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
