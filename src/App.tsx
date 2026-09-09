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
  <div className="min-h-screen bg-[#05000a] flex flex-col items-center justify-center gap-6">
    <div className="flex items-baseline gap-1">
      <span className="text-3xl font-black tracking-tighter bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
        GREAT
      </span>
      <span className="text-3xl font-extralight tracking-[0.15em] text-white/80">
        SPORT
      </span>
      <span className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-400/70 ml-1">
        BETS
      </span>
    </div>
    <div className="relative w-10 h-10">
      <div className="absolute inset-0 rounded-full border-[3px] border-white/[0.06]" />
      <div
        className="absolute inset-0 rounded-full animate-spin"
        style={{
          background: "conic-gradient(from 0deg, transparent 0%, #ec4899 35%, #a855f7 65%, #06b6d4 100%)",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
        }}
      />
    </div>
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
  const [splashDone, setSplashDone] = useState(sessionStorage.getItem("splash_shown") === "true");
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
      <SplashScreen onFinish={() => setSplashDone(true)} />
      {splashDone && (
        <>
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
        </>
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
