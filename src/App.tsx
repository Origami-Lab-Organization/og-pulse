import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RoleProtectedRoute from "@/components/auth/RoleProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import Clients from "./pages/Clients";
import NotFound from "./pages/NotFound";
import Projects from "./pages/Projects";
import Pricing from "./pages/Pricing";
import Settings from "./pages/Settings";
import Budgets from "./pages/Budgets";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="origami-pulse-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route 
                path="/change-password" 
                element={
                  <ProtectedRoute>
                    <ChangePassword />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/clients" 
                element={
                  <RoleProtectedRoute requireManager>
                    <Clients />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/projects" 
                element={
                  <RoleProtectedRoute requireManager>
                    <Projects />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/budgets" 
                element={
                  <RoleProtectedRoute requireManager>
                    <Budgets />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/pricing" 
                element={
                  <RoleProtectedRoute requireAdmin>
                    <Pricing />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <RoleProtectedRoute requireAdmin>
                    <Settings />
                  </RoleProtectedRoute>
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
