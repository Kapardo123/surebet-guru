import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SplashScreen from "./components/SplashScreen";
import UpdateRequiredModal from "./components/UpdateRequiredModal";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { useEffect, useState, lazy, Suspense } from "react";
import { initRevenueCat } from "@/integrations/revenuecat";

const Admin = lazy(() => import("./pages/Admin"));
const Premium = lazy(() => import("./pages/Premium"));
const Coupons = lazy(() => import("./pages/Coupons"));
const Auth = lazy(() => import("./pages/Auth"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const DataDeletion = lazy(() => import("./pages/DataDeletion"));

const queryClient = new QueryClient();

// Global error tracking before any React render
let globalError: string | null = null;
window.onerror = (msg, url, line, col, err) => {
  globalError = `Global Error: ${msg} at ${line}:${col}`;
  console.error(globalError, err);
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('app-error', { detail: globalError }));
  }
  return false;
};

const PageLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-[#0a0015] via-[#150025] to-[#0a0020] flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-purple-500/30 border-t-pink-500 rounded-full animate-spin" />
  </div>
);

const AnimatedRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/deletion" element={<DataDeletion />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const AppContent = () => {
  const [error, setError] = useState<string | null>(globalError);
  const {
    needsUpdate,
    forceUpdate,
    currentVersion,
    latestVersion,
    message,
    downloadUrl,
    loading: updateLoading
  } = useAppUpdate();

  useEffect(() => {
    const handleAppError = (e: any) => setError(e.detail);
    window.addEventListener('app-error', handleAppError);
    
    // Inicjalizacja RevenueCat
    const init = async () => {
      try {
        await initRevenueCat();
      } catch (e) {
        console.error("RevenueCat init failed:", e);
      }
    };
    init();

    return () => window.removeEventListener('app-error', handleAppError);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center text-center space-y-4">
        <h1 className="text-2xl font-bold text-red-500">Critical Error</h1>
        <p className="text-gray-400 font-mono text-xs max-w-md break-all">{error}</p>
        <button 
          onClick={() => {
            globalError = null;
            window.location.reload();
          }} 
          className="px-4 py-2 bg-primary rounded-lg text-white"
        >
          Reload
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
      
      {/* Update Modal - shows over everything */}
      {!updateLoading && needsUpdate && (
        <UpdateRequiredModal
          isOpen={needsUpdate}
          currentVersion={currentVersion}
          latestVersion={latestVersion}
          message={message}
          downloadUrl={downloadUrl}
        />
      )}
    </AuthProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
