import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
