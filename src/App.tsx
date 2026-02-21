import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { toast } from "sonner";
import '@/i18n';

import { AuthProvider } from "@/contexts/AuthContext";
import { ProductProvider } from "@/contexts/ProductContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardGuard } from "@/components/DashboardGuard";
import { getSubdomain } from "@/lib/subdomain";

// Vendor pages
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
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
const NotFound = lazy(() => import("./pages/NotFound"));
const ShopStorefront = lazy(() => import("./pages/ShopStorefront"));
const ShopCreatedSuccess = lazy(() => import("./pages/ShopCreatedSuccess"));
const ShopStorefrontRoute = lazy(() => import("./pages/ShopStorefrontRoute"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminVendors = lazy(() => import("./pages/admin/AdminVendors"));
const AdminVendorDetail = lazy(() => import("./pages/admin/AdminVendorDetail"));
const AdminStores = lazy(() => import("./pages/admin/AdminStores"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));

// Admin guard
import { AdminGuard } from "@/components/admin/AdminGuard";

const queryClient = new QueryClient();

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

const App = () => {
  const subdomain = getSubdomain();

  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      toast.error("Une erreur est survenue. Veuillez réessayer.");
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  if (subdomain) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<LoadingSpinner />}>
              <ShopStorefront slug={subdomain} />
            </Suspense>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  return (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ProductProvider>
          <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/support" element={<Support />} />

            {/* Vendor dashboard */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardGuard><Dashboard /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/products" element={<ProtectedRoute><DashboardGuard><Products /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/products/new" element={<ProtectedRoute><DashboardGuard><AddProduct /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/orders" element={<ProtectedRoute><DashboardGuard><Orders /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/create-shop" element={<ProtectedRoute><DashboardGuard><CreateShop /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/shop-created" element={<ProtectedRoute><DashboardGuard><ShopCreatedSuccess /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/products/:id/edit" element={<ProtectedRoute><DashboardGuard><EditProduct /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/settings" element={<ProtectedRoute><DashboardGuard><Settings /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/commandes/:orderId" element={<ProtectedRoute><DashboardGuard><OrderDetail /></DashboardGuard></ProtectedRoute>} />

            {/* Settings V6 */}
            <Route path="/dashboard/parametres" element={<ProtectedRoute><DashboardGuard><SettingsHub /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/parametres/identite" element={<ProtectedRoute><DashboardGuard><SettingsIdentite /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/parametres/domaine" element={<ProtectedRoute><DashboardGuard><SettingsDomaine /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/parametres/apparence" element={<ProtectedRoute><DashboardGuard><SettingsApparence /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/parametres/livraison" element={<ProtectedRoute><DashboardGuard><SettingsLivraison /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/parametres/paiement" element={<ProtectedRoute><DashboardGuard><SettingsPaiement /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/parametres/codes-promo" element={<ProtectedRoute><DashboardGuard><SettingsCodesPromo /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/parametres/seo" element={<ProtectedRoute><DashboardGuard><SettingsSeo /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/parametres/pixels" element={<ProtectedRoute><DashboardGuard><SettingsPixels /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/parametres/notifications" element={<ProtectedRoute><DashboardGuard><SettingsNotifications /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/parametres/support" element={<ProtectedRoute><DashboardGuard><SettingsSupport /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/parametres/profil" element={<ProtectedRoute><DashboardGuard><SettingsProfil /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/parametres/equipe" element={<ProtectedRoute><DashboardGuard><SettingsEquipe /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/parametres/facturation" element={<ProtectedRoute><DashboardGuard><SettingsFacturation /></DashboardGuard></ProtectedRoute>} />
            <Route path="/dashboard/parametres/api" element={<ProtectedRoute><DashboardGuard><SettingsApi /></DashboardGuard></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute><AdminGuard><AdminDashboard /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/vendors" element={<ProtectedRoute><AdminGuard><AdminVendors /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/vendors/:id" element={<ProtectedRoute><AdminGuard><AdminVendorDetail /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/stores" element={<ProtectedRoute><AdminGuard><AdminStores /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/products" element={<ProtectedRoute><AdminGuard><AdminProducts /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute><AdminGuard><AdminReports /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/subscriptions" element={<ProtectedRoute><AdminGuard><AdminSubscriptions /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><AdminGuard><AdminUsers /></AdminGuard></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute><AdminGuard role="super_admin"><AdminSettings /></AdminGuard></ProtectedRoute>} />

            {/* Storefront */}
            <Route path="/boutique/:slug" element={<ShopStorefrontRoute />} />
            <Route path="/shop/:slug" element={<ShopStorefrontRoute />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </ProductProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
  );
};

export default App;
