import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import NativeShell from "@/components/NativeShell";
import OfflineBanner from "@/components/OfflineBanner";
import AnalyticsRouteTracker from "@/components/AnalyticsRouteTracker";
import SkipToContent from "@/components/SkipToContent";

// Auth & root tabs are eagerly loaded (entry points users hit first / most often).
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";

// Code-split secondary routes — keeps the initial JS bundle small for cold starts on mobile.
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
const CarePage = lazy(() => import("./pages/CarePage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));
const SearchResultsPage = lazy(() => import("./pages/SearchResultsPage"));
const PlaceDetailPage = lazy(() => import("./pages/PlaceDetailPage"));
const FindMyPetPage = lazy(() => import("./pages/FindMyPetPage"));
const StorePage = lazy(() => import("./pages/StorePage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const CreditsPage = lazy(() => import("./pages/CreditsPage"));
const LikedProductsPage = lazy(() => import("./pages/LikedProductsPage"));
const PostDetailPage = lazy(() => import("./pages/PostDetailPage"));
const TagFeedPage = lazy(() => import("./pages/TagFeedPage"));
const ProviderPage = lazy(() => import("./pages/ProviderPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

/**
 * Lightweight fallback shown while a lazy route chunk loads.
 * Matches the app background so the transition feels instant on slow networks.
 */
const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000,     // 3 min — cache-first
      gcTime: 10 * 60 * 1000,       // 10 min garbage collection
      refetchOnWindowFocus: false,
      // Retry transient failures (network drops, 5xx) up to 2x with backoff.
      // React Query auto-pauses fetches while offline and resumes on reconnect.
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      networkMode: "offlineFirst",
    },
    mutations: {
      // Mutations queued while offline are paused and replayed on reconnect.
      // This prevents silent failures when the user taps during a dropout.
      retry: 1,
      networkMode: "offlineFirst",
    },
  },
});

const App = () => (
  <ErrorBoundary area="the app">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <SkipToContent />
              <NativeShell />
              <OfflineBanner />
              <AnalyticsRouteTracker />
              <ErrorBoundary area="this page">
                <Suspense fallback={<RouteFallback />}>
                  {/* Primary landmark — target of the SkipToContent link.
                      tabIndex=-1 lets us programmatically focus it on route change. */}
                  <main id="main-content" tabIndex={-1} className="outline-none">
                  <Routes>
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/explore" element={<ProtectedRoute><ExplorePage /></ProtectedRoute>} />
                    <Route path="/marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
                    <Route path="/care" element={<ProtectedRoute><CarePage /></ProtectedRoute>} />
                    <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                    <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                    <Route path="/user/:username" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
                    <Route path="/search" element={<ProtectedRoute><SearchResultsPage /></ProtectedRoute>} />
                    <Route path="/place/:id" element={<ProtectedRoute><PlaceDetailPage /></ProtectedRoute>} />
                    <Route path="/find-my-pet" element={<ProtectedRoute><FindMyPetPage /></ProtectedRoute>} />
                    <Route path="/store/:id" element={<ProtectedRoute><StorePage /></ProtectedRoute>} />
                    <Route path="/product/:id" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
                    <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
                    <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
                    <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
                    <Route path="/credits" element={<ProtectedRoute><CreditsPage /></ProtectedRoute>} />
                    <Route path="/liked-products" element={<ProtectedRoute><LikedProductsPage /></ProtectedRoute>} />
                    <Route path="/post/:id" element={<ProtectedRoute><PostDetailPage /></ProtectedRoute>} />
                    <Route path="/tag/:tag" element={<ProtectedRoute><TagFeedPage /></ProtectedRoute>} />
                    <Route path="/provider/:id" element={<ProtectedRoute><ProviderPage /></ProtectedRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
