import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AnimatePresence } from "framer-motion";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Premium from "./pages/Premium";
import Coupons from "./pages/Coupons";
import Auth from "./pages/Auth";
import Referral from "./pages/Referral";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import DataDeletion from "./pages/DataDeletion";
import NotFound from "./pages/NotFound";
import SplashScreen from "./components/SplashScreen";
import { useEffect } from "react";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Index />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/referral" element={<Referral />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/deletion" element={<DataDeletion />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

// Simple Error Boundary
const AppContent = () => {
  useEffect(() => {
    // Log any global errors to the console (visible in Android Studio logcat)
    window.onerror = (msg, url, line, col, error) => {
      console.error("GLOBAL ERROR:", msg, "at", url, line, col, error);
    };
    window.onunhandledrejection = (event) => {
      console.error("UNHANDLED REJECTION:", event.reason);
    };
  }, []);

  return (
    <AuthProvider>
      <SplashScreen />
      <Toaster />
      <Sonner />
      <HashRouter>
        <AnimatedRoutes />
      </HashRouter>
    </AuthProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <HashRouter> {/* AuthProvider needs to be inside the router to use navigate */}
        <AppContent />
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
