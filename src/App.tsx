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
import ProjectDetail from "./pages/ProjectDetail";
import AdminPortal from "./pages/AdminPortal";
import Budgets from "./pages/Budgets";
import BudgetForm from "./pages/BudgetForm";
import BudgetDetail from "./pages/BudgetDetail";
import LandingPage from "./pages/LandingPage";
import UnderConstruction from "./pages/UnderConstruction";
import Suppliers from "./pages/Suppliers";
import CRM from "./pages/CRM";
import Portfolio from "./pages/Portfolio";
import Timesheets from "./pages/Timesheets";
import Analytics from "./pages/Analytics";
import Reimbursements from "./pages/Reimbursements";

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
              {/* Reimbursements - all authenticated users */}
              <Route 
                path="/reimbursements" 
                element={
                  <ProtectedRoute>
                    <Reimbursements />
                  </ProtectedRoute>
                } 
              />
              {/* Management routes - Manager or Admin */}
              <Route 
                path="/" 
                element={
                  <RoleProtectedRoute requireManager>
                    <Index />
                  </RoleProtectedRoute>
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
                path="/suppliers" 
                element={
                  <RoleProtectedRoute requireManager>
                    <Suppliers />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/portfolio" 
                element={
                  <RoleProtectedRoute requireManager>
                    <Portfolio />
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
                path="/projects/:id" 
                element={
                  <RoleProtectedRoute requireManager>
                    <ProjectDetail />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/timesheets" 
                element={
                  <RoleProtectedRoute requireManager>
                    <Timesheets />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/analytics" 
                element={
                  <RoleProtectedRoute requireManager>
                    <Analytics />
                  </RoleProtectedRoute>
                } 
              />
              <Route
                path="/crm" 
                element={
                  <RoleProtectedRoute requireManager>
                    <CRM />
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
                path="/budgets/new" 
                element={
                  <RoleProtectedRoute requireManager>
                    <BudgetForm />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/budgets/:id" 
                element={
                  <RoleProtectedRoute requireManager>
                    <BudgetDetail />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/budgets/:id/edit" 
                element={
                  <RoleProtectedRoute requireManager>
                    <BudgetForm />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <RoleProtectedRoute requireAdmin>
                    <AdminPortal />
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
