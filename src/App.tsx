import { useEffect, lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import '@/i18n';

import { AuthProvider } from "@/contexts/AuthContext";
import { ProductProvider } from "@/contexts/ProductContext";
import { getStoreSlugFromHostname } from "@/lib/subdomain";
import { StorefrontProvider } from "@/contexts/StorefrontContext";
import { CountryProvider } from "@/contexts/CountryContext";

// Shared dashboard shell (guards + layout mounted once)
const DashboardShell = lazy(() => import("./components/dashboard/DashboardShell"));

// Vendor pages
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const AddProduct = lazy(() => import("./pages/AddProduct"));
const EditProduct = lazy(() => import("./pages/EditProduct"));
const Orders = lazy(() => import("./pages/Orders"));
const CreateShop = lazy(() => import("./pages/CreateShop"));
const About = lazy(() => import("./pages/About"));
const Support = lazy(() => import("./pages/Support"));
const Settings = lazy(() => import("./pages/Settings"));
const SettingsHub = lazy(() => import("./pages/settings/SettingsHub"));
const SettingsIdentite = lazy(() => import("./pages/settings/SettingsIdentite"));
const SettingsDomaine = lazy(() => import("./pages/settings/SettingsDomaine"));
const SettingsApparence = lazy(() => import("./pages/settings/SettingsApparence"));
const SettingsLivraison = lazy(() => import("./pages/settings/SettingsLivraison"));
const SettingsPaiement = lazy(() => import("./pages/settings/SettingsPaiement"));
const SettingsCodesPromo = lazy(() => import("./pages/settings/SettingsCodesPromo"));
const SettingsSeo = lazy(() => import("./pages/settings/SettingsSeo"));
const SettingsPixels = lazy(() => import("./pages/settings/SettingsPixels"));
const SettingsNotifications = lazy(() => import("./pages/settings/SettingsNotifications"));
const SettingsSupport = lazy(() => import("./pages/settings/SettingsSupport"));
const SettingsProfil = lazy(() => import("./pages/settings/SettingsProfil"));
const SettingsEquipe = lazy(() => import("./pages/settings/SettingsEquipe"));
const SettingsFacturation = lazy(() => import("./pages/settings/SettingsFacturation"));
const SettingsApi = lazy(() => import("./pages/settings/SettingsApi"));
const SettingsPages = lazy(() => import("./pages/settings/SettingsPages"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ShopStorefront = lazy(() => import("./pages/ShopStorefront"));
const ShopCreatedSuccess = lazy(() => import("./pages/ShopCreatedSuccess"));
const ShopStorefrontRoute = lazy(() => import("./pages/ShopStorefrontRoute"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Customers = lazy(() => import("./pages/Customers"));
const Reviews = lazy(() => import("./pages/Reviews"));


// Marketing pages
const MarketingHub = lazy(() => import("./pages/marketing/MarketingHub"));
const MarketingAnalytics = lazy(() => import("./pages/marketing/MarketingAnalytics"));
const MarketingCoupons = lazy(() => import("./pages/marketing/MarketingCoupons"));
const MarketingPromos = lazy(() => import("./pages/marketing/MarketingPromos"));
const MarketingLinks = lazy(() => import("./pages/marketing/MarketingLinks"));
const CampaignDetail = lazy(() => import("./pages/marketing/CampaignDetail"));
const MarketingPixels = lazy(() => import("./pages/marketing/MarketingPixels"));

// Marketplace pages
const MarketplaceLayout = lazy(() => import("./components/marketplace/MarketplaceLayout"));
const MarketplaceHome = lazy(() => import("./pages/marketplace/MarketplaceHome"));
const MarketplaceCategory = lazy(() => import("./pages/marketplace/MarketplaceCategory"));
const MarketplaceSearch = lazy(() => import("./pages/marketplace/MarketplaceSearch"));
const MarketplaceProductPage = lazy(() => import("./pages/marketplace/MarketplaceProductPage"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminVendors = lazy(() => import("./pages/admin/AdminVendors"));
const AdminVendorDetail = lazy(() => import("./pages/admin/AdminVendorDetail"));
const AdminStores = lazy(() => import("./pages/admin/AdminStores"));
const AdminDeletedStores = lazy(() => import("./pages/admin/AdminDeletedStores"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminEmailHub = lazy(() => import("./pages/admin/AdminEmailHub"));
const AdminEmailProviders = lazy(() => import("./pages/admin/AdminEmailProviders"));
const AdminEmailProviderConfig = lazy(() => import("./pages/admin/AdminEmailProviderConfig"));
const AdminEmailDefaultTemplate = lazy(() => import("./pages/admin/AdminEmailDefaultTemplate"));
const AdminEmailTemplates = lazy(() => import("./pages/admin/AdminEmailTemplates"));
const AdminEmailLogs = lazy(() => import("./pages/admin/AdminEmailLogs"));
const AdminEmailDomains = lazy(() => import("./pages/admin/AdminEmailDomains"));
const AdminShopDiagnostic = lazy(() => import("./pages/admin/AdminShopDiagnostic"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminFeedback = lazy(() => import("./pages/admin/AdminFeedback"));
const AdminMarketplaceCategories = lazy(() => import("./pages/admin/AdminMarketplaceCategories"));
const AdminMarketplaceBanners = lazy(() => import("./pages/admin/AdminMarketplaceBanners"));

// Admin guard
import { AdminGuard } from "@/components/admin/AdminGuard";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

const App = () => {
  const hostnameSlug = getStoreSlugFromHostname();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[Ventou] hostname:', window.location.hostname);
      console.log('[Ventou] hostnameSlug:', hostnameSlug);
      console.log('[Ventou] pathname:', window.location.pathname);
    }
  }, [hostnameSlug]);

  if (hostnameSlug) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <QueryClientProvider client={queryClient}>
          <CountryProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <StorefrontProvider routeSlug={hostnameSlug}>
                <Suspense fallback={<LoadingSpinner />}>
                  <ErrorBoundary fallbackMessage={`Erreur lors du chargement de la boutique "${hostnameSlug}"`}>
                    <Routes>
                      <Route path="/p/:productSlug" element={<ShopStorefront slug={hostnameSlug} basePath="" />} />
                      <Route path="/page/:pageSlug" element={<ShopStorefront slug={hostnameSlug} basePath="" />} />
                      <Route path="*" element={<ShopStorefront slug={hostnameSlug} basePath="" />} />
                    </Routes>
                  </ErrorBoundary>
                </Suspense>
              </StorefrontProvider>
            </BrowserRouter>
          </TooltipProvider>
          </CountryProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  return (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
  <QueryClientProvider client={queryClient}>
    <CountryProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/support" element={<Support />} />

            {/* Dashboard — shared shell: auth + shop guard + layout mounted ONCE */}
            <Route path="/dashboard" element={<DashboardShell />}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<ProductProvider><Products /></ProductProvider>} />
              <Route path="products/new" element={<ProductProvider><AddProduct /></ProductProvider>} />
              <Route path="products/:id/edit" element={<ProductProvider><EditProduct /></ProductProvider>} />
              <Route path="orders" element={<Orders />} />
              <Route path="create-shop" element={<CreateShop />} />
              <Route path="shop-created" element={<ShopCreatedSuccess />} />
              <Route path="settings" element={<Settings />} />
              <Route path="commandes/:orderId" element={<OrderDetail />} />
              <Route path="customers" element={<Customers />} />
              <Route path="marketing/reviews" element={<Reviews />} />
              

              {/* Marketing */}
              <Route path="marketing" element={<MarketingHub />} />
              <Route path="marketing/analytics" element={<MarketingAnalytics />} />
              <Route path="marketing/coupons" element={<MarketingCoupons />} />
              <Route path="marketing/promos" element={<MarketingPromos />} />
              <Route path="marketing/liens" element={<MarketingLinks />} />
              <Route path="marketing/liens/:linkId" element={<CampaignDetail />} />
              <Route path="marketing/pixels" element={<MarketingPixels />} />

              {/* Settings V6 */}
              <Route path="parametres" element={<SettingsHub />} />
              <Route path="parametres/identite" element={<SettingsIdentite />} />
              <Route path="parametres/domaine" element={<SettingsDomaine />} />
              <Route path="parametres/apparence" element={<SettingsApparence />} />
              <Route path="parametres/livraison" element={<SettingsLivraison />} />
              <Route path="parametres/paiement" element={<SettingsPaiement />} />
              <Route path="parametres/codes-promo" element={<SettingsCodesPromo />} />
              <Route path="parametres/seo" element={<SettingsSeo />} />
              <Route path="parametres/pixels" element={<SettingsPixels />} />
              <Route path="parametres/notifications" element={<SettingsNotifications />} />
              <Route path="parametres/support" element={<SettingsSupport />} />
              <Route path="parametres/profil" element={<SettingsProfil />} />
              <Route path="parametres/equipe" element={<SettingsEquipe />} />
              <Route path="parametres/facturation" element={<SettingsFacturation />} />
              <Route path="parametres/api" element={<SettingsApi />} />
              <Route path="parametres/pages" element={<SettingsPages />} />
            </Route>

            {/* Hidden admin login */}
            <Route path="/0x8v3k/auth" element={<AdminLogin />} />

            {/* Admin — returns 404 for non-admins */}
            <Route path="/admin" element={<ProtectedRoute fallback="notfound"><AdminGuard><AdminDashboard /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/vendors" element={<ProtectedRoute fallback="notfound"><AdminGuard><AdminVendors /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/vendors/:id" element={<ProtectedRoute fallback="notfound"><AdminGuard><AdminVendorDetail /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/stores" element={<ProtectedRoute fallback="notfound"><AdminGuard><AdminStores /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/deleted-stores" element={<ProtectedRoute fallback="notfound"><AdminGuard role="super_admin"><AdminDeletedStores /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/products" element={<ProtectedRoute fallback="notfound"><AdminGuard><AdminProducts /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute fallback="notfound"><AdminGuard><AdminReports /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/subscriptions" element={<ProtectedRoute fallback="notfound"><AdminGuard><AdminSubscriptions /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute fallback="notfound"><AdminGuard><AdminUsers /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute fallback="notfound"><AdminGuard role="super_admin"><AdminSettings /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/shop-diagnostic" element={<ProtectedRoute fallback="notfound"><AdminGuard role="super_admin"><AdminShopDiagnostic /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/settings/email" element={<ProtectedRoute fallback="notfound"><AdminGuard role="super_admin"><AdminEmailHub /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/settings/email/providers" element={<ProtectedRoute fallback="notfound"><AdminGuard role="super_admin"><AdminEmailProviders /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/settings/email/providers/:driver" element={<ProtectedRoute fallback="notfound"><AdminGuard role="super_admin"><AdminEmailProviderConfig /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/settings/email/default-template" element={<ProtectedRoute fallback="notfound"><AdminGuard role="super_admin"><AdminEmailDefaultTemplate /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/settings/email/templates" element={<ProtectedRoute fallback="notfound"><AdminGuard role="super_admin"><AdminEmailTemplates /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/settings/email/logs" element={<ProtectedRoute fallback="notfound"><AdminGuard role="super_admin"><AdminEmailLogs /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/settings/email/domains" element={<ProtectedRoute fallback="notfound"><AdminGuard role="super_admin"><AdminEmailDomains /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/marketplace/categories" element={<ProtectedRoute fallback="notfound"><AdminGuard role="super_admin"><AdminMarketplaceCategories /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/marketplace/banners" element={<ProtectedRoute fallback="notfound"><AdminGuard role="super_admin"><AdminMarketplaceBanners /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/feedback" element={<ProtectedRoute fallback="notfound"><AdminGuard><AdminFeedback /></AdminGuard></ProtectedRoute>} />

            {/* Marketplace */}
            <Route path="/marketplace" element={<MarketplaceLayout />}>
              <Route index element={<MarketplaceHome />} />
              <Route path="search" element={<MarketplaceSearch />} />
              <Route path=":categorySlug" element={<MarketplaceCategory />} />
            </Route>

            {/* Storefront */}
            <Route path="/boutique/:slug" element={<ShopStorefrontRoute />} />
            <Route path="/boutique/:slug/p/:productSlug" element={<ShopStorefrontRoute />} />
            <Route path="/boutique/:slug/page/:pageSlug" element={<ShopStorefrontRoute />} />
            <Route path="/shop/:slug" element={<ShopStorefrontRoute />} />
            <Route path="/shop/:slug/p/:productSlug" element={<ShopStorefrontRoute />} />
            <Route path="/shop/:slug/page/:pageSlug" element={<ShopStorefrontRoute />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </CountryProvider>
  </QueryClientProvider>
  </ThemeProvider>
  );
};

export default App;
