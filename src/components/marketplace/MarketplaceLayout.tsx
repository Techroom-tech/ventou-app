import { Link, Outlet, useNavigate } from "react-router-dom";
import { Search, Store, Menu, SlidersHorizontal, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { useMarketplaceCategories } from "@/hooks/useMarketplaceCategories";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MarketplaceLayout() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const searchRef = useRef<HTMLDivElement>(null);
  const { data: categories } = useMarketplaceCategories();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/marketplace/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="bg-primary text-primary-foreground text-xs py-1.5 text-center font-medium tracking-wide">
        🚀 Bienvenue sur Ventou Marketplace — Livraison partout en Afrique
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-14 md:h-16 items-center gap-3 md:gap-6">
            {/* Mobile menu */}
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0 -ml-2">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0">
                  <div className="p-6">
                    <Link to="/marketplace" className="flex items-center gap-2 mb-6">
                      <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                        <Store className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <span className="font-bold text-lg block leading-tight">Ventou</span>
                        <span className="text-[10px] text-muted-foreground">Marketplace</span>
                      </div>
                    </Link>
                    <nav className="space-y-1">
                      <Link to="/marketplace" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-sm font-medium">
                        <Store className="h-4 w-4" /> Accueil
                      </Link>
                      {categories?.map((cat) => (
                        <Link
                          key={cat.id}
                          to={`/marketplace/${cat.slug}`}
                          className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted text-sm"
                        >
                          <span>{cat.name}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </Link>
                      ))}
                    </nav>
                    <div className="mt-8 space-y-2">
                      <Button asChild className="w-full" size="sm">
                        <Link to="/signup">Créer ma boutique</Link>
                      </Button>
                      <Button asChild variant="outline" className="w-full" size="sm">
                        <Link to="/login">Connexion</Link>
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}

            {/* Logo */}
            <Link to="/marketplace" className="flex items-center gap-2 shrink-0">
              <div className="h-8 w-8 md:h-9 md:w-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <Store className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="font-bold text-lg leading-tight">Ventou</span>
              </div>
            </Link>

            {/* Search */}
            <div ref={searchRef} className="flex-1 max-w-2xl relative">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Rechercher produits, boutiques..."
                    className="w-full h-10 md:h-11 pl-10 pr-20 rounded-xl border bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-background transition-all"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(e.target.value.length > 1);
                    }}
                    onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
                  />
                  <Button type="submit" size="sm" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg h-7 md:h-8 text-xs px-3">
                    Chercher
                  </Button>
                </div>
              </form>
              {/* Filter button */}
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 h-10 w-10 md:h-11 md:w-11 rounded-xl"
                onClick={() => navigate("/marketplace/search")}
                title="Filtres"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>

              {/* Quick suggestions */}
              {showSuggestions && categories && categories.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="p-2">
                    <p className="text-[10px] uppercase text-muted-foreground font-medium px-3 py-1">Catégories</p>
                    {categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5).map((cat) => (
                      <button
                        key={cat.id}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors text-left"
                        onClick={() => {
                          navigate(`/marketplace/${cat.slug}`);
                          setShowSuggestions(false);
                          setSearchQuery("");
                        }}
                      >
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                        {cat.name}
                      </button>
                    ))}
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-primary hover:bg-muted rounded-lg transition-colors font-medium"
                      onClick={() => {
                        navigate(`/marketplace/search?q=${encodeURIComponent(searchQuery)}`);
                        setShowSuggestions(false);
                      }}
                    >
                      <Search className="h-3.5 w-3.5" />
                      Rechercher "{searchQuery}"
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex text-sm">
                <Link to="/login">Connexion</Link>
              </Button>
              <Button size="sm" asChild className="hidden md:inline-flex rounded-lg shadow-sm">
                <Link to="/signup">Créer ma boutique</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Categories bar (desktop) */}
        {!isMobile && categories && categories.length > 0 && (
          <div className="border-t">
            <div className="container mx-auto px-4">
              <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1.5">
                <Link
                  to="/marketplace"
                  className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-full hover:bg-muted transition-colors"
                >
                  Tout
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/marketplace/${cat.slug}`}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {cat.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-12">
        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
                  <Store className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">Ventou</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                La marketplace africaine pour acheter et vendre en toute confiance.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Marketplace</h4>
              <nav className="space-y-2 text-xs text-muted-foreground">
                <Link to="/marketplace" className="block hover:text-foreground transition-colors">Accueil</Link>
                <Link to="/marketplace/search" className="block hover:text-foreground transition-colors">Tous les produits</Link>
              </nav>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Vendeurs</h4>
              <nav className="space-y-2 text-xs text-muted-foreground">
                <Link to="/signup" className="block hover:text-foreground transition-colors">Créer ma boutique</Link>
                <Link to="/login" className="block hover:text-foreground transition-colors">Connexion</Link>
              </nav>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Support</h4>
              <nav className="space-y-2 text-xs text-muted-foreground">
                <Link to="/about" className="block hover:text-foreground transition-colors">À propos</Link>
                <Link to="/support" className="block hover:text-foreground transition-colors">Aide</Link>
              </nav>
            </div>
          </div>
          <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Ventou. Tous droits réservés.</p>
            <div className="flex gap-4">
              <Link to="/about" className="hover:text-foreground transition-colors">Conditions</Link>
              <Link to="/about" className="hover:text-foreground transition-colors">Confidentialité</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
