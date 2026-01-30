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
import Register from "./pages/Register";
import ChangePassword from "./pages/ChangePassword";
import Clients from "./pages/Clients";
import NotFound from "./pages/NotFound";
import Projects from "./pages/Projects";
import Pricing from "./pages/Pricing";
import Settings from "./pages/Settings";
import Budgets from "./pages/Budgets";
import BudgetForm from "./pages/BudgetForm";
import BudgetDetail from "./pages/BudgetDetail";
import LandingPage from "./pages/LandingPage";
import UnderConstruction from "./pages/UnderConstruction";
import Suppliers from "./pages/Suppliers";

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
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route 
                path="/change-password" 
                element={
                  <ProtectedRoute>
                    <ChangePassword />
                  </ProtectedRoute>
                } 
              />
              {/* Dashboard - accessible to all authenticated users */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <UnderConstruction />
                  </ProtectedRoute>
                } 
              />
              {/* Management routes - Admin only */}
              <Route 
                path="/" 
                element={
                  <RoleProtectedRoute requireAdmin>
                    <Index />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/clients" 
                element={
                  <RoleProtectedRoute requireAdmin>
                    <Clients />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/suppliers" 
                element={
                  <RoleProtectedRoute requireAdmin>
                    <Suppliers />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/projects" 
                element={
                  <RoleProtectedRoute requireAdmin>
                    <Projects />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/budgets" 
                element={
                  <RoleProtectedRoute requireAdmin>
                    <Budgets />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/budgets/new" 
                element={
                  <RoleProtectedRoute requireAdmin>
                    <BudgetForm />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/budgets/:id" 
                element={
                  <RoleProtectedRoute requireAdmin>
                    <BudgetDetail />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/budgets/:id/edit" 
                element={
                  <RoleProtectedRoute requireAdmin>
                    <BudgetForm />
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
