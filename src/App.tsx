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
import { useEffect, useState } from "react";

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

// Simple Error Boundary and Debug UI
const AppContent = () => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Log any global errors to the console
    const errorHandler = (msg: any, url: any, line: any, col: any, err: any) => {
      const errorMsg = `Error: ${msg} at ${line}:${col}`;
      console.error("GLOBAL ERROR:", errorMsg, err);
      setError(errorMsg);
      return false;
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const errorMsg = `Unhandled Rejection: ${event.reason}`;
      console.error(errorMsg);
      setError(errorMsg);
    };

    window.onerror = errorHandler;
    window.onunhandledrejection = rejectionHandler;

    return () => {
      window.onerror = null;
      window.onunhandledrejection = null;
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center text-center space-y-4">
        <h1 className="text-2xl font-bold text-red-500">Application Error</h1>
        <p className="text-gray-400 max-w-md">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-primary rounded-lg text-white"
        >
          Reload Application
        </button>
      </div>
    );
  }

  return (
    <AuthProvider>
      <SplashScreen />
      <Toaster />
      <Sonner />
      <AnimatedRoutes />
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
