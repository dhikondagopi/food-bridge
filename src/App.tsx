import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AnimatedRoutes from "@/components/AnimatedRoutes";

const queryClient = new QueryClient();

const AppContent = () => {
  return (
    <TooltipProvider>
      <Routes>
        <Route path="/*" element={<AnimatedRoutes />} />
      </Routes>
      <SonnerToaster richColors position="top-right" />
    </TooltipProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;