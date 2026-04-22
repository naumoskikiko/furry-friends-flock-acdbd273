import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import ExplorePage from "./pages/ExplorePage";
import MarketplacePage from "./pages/MarketplacePage";
import CarePage from "./pages/CarePage";
import MessagesPage from "./pages/MessagesPage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SettingsPage from "./pages/SettingsPage";
import NotificationsPage from "./pages/NotificationsPage";
import UserProfilePage from "./pages/UserProfilePage";
import SearchResultsPage from "./pages/SearchResultsPage";
import PlaceDetailPage from "./pages/PlaceDetailPage";
import FindMyPetPage from "./pages/FindMyPetPage";
import StorePage from "./pages/StorePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import CreditsPage from "./pages/CreditsPage";
import LikedProductsPage from "./pages/LikedProductsPage";
import PostDetailPage from "./pages/PostDetailPage";
import TagFeedPage from "./pages/TagFeedPage";
import ProviderPage from "./pages/ProviderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000,     // 3 min — cache-first
      gcTime: 10 * 60 * 1000,       // 10 min garbage collection
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
