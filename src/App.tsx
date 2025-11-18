import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Browse from "./pages/Browse";
import Shopkeeper from "./pages/Shopkeeper";
import NotFound from "./pages/NotFound";

// NEW pages
import MyTokens from "./pages/MyTokens";
import ShopkeeperDashboard from "./pages/ShopkeeperDashboard";
import ShopkeeperAuth from "./pages/ShopkeeperAuth";
import ShopCreate from "./pages/ShopCreate";
import QRScanner from "./pages/QRScanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/browse" element={<Browse />} />

          {/* Shopkeeper area */}
          <Route path="/shopkeeper" element={<Shopkeeper />} />
          <Route path="/shopkeeper/dashboard" element={<ShopkeeperDashboard />} />
          <Route path="/shopkeeper/auth" element={<ShopkeeperAuth />} />
          <Route path="/shopkeeper/qr-scan" element={<QRScanner />} />
          <Route path="/shopkeeper/create" element={<ShopCreate />} />
          {/* Customer pages */}
          <Route path="/my-tokens" element={<MyTokens />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
