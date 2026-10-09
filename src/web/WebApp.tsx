import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import DataDeletion from "@/pages/DataDeletion";
import Admin from "@/pages/Admin";

const queryClient = new QueryClient();

/**
 * The web build is a single self-contained landing page:
 *   - "/" is the main page (tips board, accumulator, checkout, login dialog)
 *   - "/premium" and "/auth" still exist because Stripe's return URL
 *     (`#/premium?success=...`) and password-reset emails
 *     (`#/auth?mode=update-password`) point at them — both render the landing.
 *   - Legal pages and the admin panel stay standalone.
 *   - Everything else (old app shell) redirects home.
 */
const WebApp = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <HashRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/premium" element={<Landing />} />
            <Route path="/auth" element={<Landing />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/deletion" element={<DataDeletion />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default WebApp;
