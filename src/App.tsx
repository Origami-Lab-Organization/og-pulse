import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RoleProtectedRoute from "@/components/auth/RoleProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import Clients from "./pages/Clients";
import NotFound from "./pages/NotFound";
import JobApplication from "./pages/JobApplication";
import ProjectDetail from "./pages/ProjectDetail";
import MyProjects from "./pages/MyProjects";
import MyProjectDetail from "./pages/MyProjectDetail";
import AdminPortal from "./pages/AdminPortal";
import BudgetForm from "./pages/BudgetForm";
import BudgetDetail from "./pages/BudgetDetail";
import LandingPage from "./pages/LandingPage";
import Suppliers from "./pages/Suppliers";
import CRM from "./pages/CRM";
import ArchivedLeads from "./pages/ArchivedLeads";
import Portfolio from "./pages/Portfolio";
import Timesheets from "./pages/Timesheets";
import EmployeeTimesheetPage from "./pages/EmployeeTimesheetPage";
import Analytics from "./pages/Analytics";
import Reimbursements from "./pages/Reimbursements";
import MyTimesheet from "./pages/MyTimesheet";
import CommercialDashboard from "./pages/CommercialDashboard";
import Welcome from "./pages/Welcome";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import TerminatedEmployees from "./pages/TerminatedEmployees";
import Candidates from "./pages/Candidates";
import Services from "./pages/Services";
import Inbox from "./pages/Inbox";
import JobOpenings from "./pages/JobOpenings";
import JobApplicationVaga from "./pages/JobApplicationVaga";
import Strategy from "./pages/Strategy";
import MyKanban from "./pages/MyKanban";
import BenefitsAndTools from "./pages/BenefitsAndTools";
import MyVacation from "./pages/MyVacation";
import VacationManagement from "./pages/VacationManagement";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 2 * 60 * 1000 } },
});

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
              <Route path="/register" element={<Navigate to="/login" replace />} />
              <Route path="/esqueci-minha-senha" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/boas-vindas" element={<Welcome />} />
              <Route path="/termos" element={<Terms />} />
              <Route path="/privacidade" element={<Privacy />} />
              <Route 
                path="/change-password" 
                element={
                  <ProtectedRoute>
                    <ChangePassword />
                  </ProtectedRoute>
                } 
              />
              {/* Root redirect */}
              <Route path="/" element={<Navigate to="/inbox" replace />} />
              <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
              {/* My Timesheet - all authenticated users */}
              <Route 
                path="/my-timesheet" 
                element={
                  <ProtectedRoute>
                    <MyTimesheet />
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
              {/* Minhas Férias - all authenticated users */}
              <Route
                path="/minhas-ferias"
                element={
                  <ProtectedRoute>
                    <MyVacation />
                  </ProtectedRoute>
                }
              />
              {/* Management routes - Manager or Admin */}
              <Route 
                path="/employees" 
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
                path="/projects/:id"
                element={
                  <ProtectedRoute>
                    <ProjectDetail />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/alocacao"
                element={
                  <RoleProtectedRoute requireManager>
                    <Timesheets />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/alocacao/:employeeId"
                element={
                  <RoleProtectedRoute requireManager>
                    <EmployeeTimesheetPage />
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
                path="/comercial"
                element={
                  <RoleProtectedRoute requireManager>
                    <CommercialDashboard />
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
                path="/crm/archived"
                element={
                  <RoleProtectedRoute requireManager>
                    <ArchivedLeads />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/comercial/servicos"
                element={
                  <RoleProtectedRoute requireManager>
                    <Services />
                  </RoleProtectedRoute>
                }
              />
              <Route path="/budgets" element={<Navigate to="/crm" replace />} />
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
              <Route 
                path="/rh/funcionarios-desligados" 
                element={
                  <RoleProtectedRoute requireManager>
                    <TerminatedEmployees />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/rh/desligamentos" 
                element={
                  <RoleProtectedRoute requireManager>
                    <TerminatedEmployees />
                  </RoleProtectedRoute>
                } 
              />
              <Route path="/my-kanban" element={<ProtectedRoute><MyKanban /></ProtectedRoute>} />
              <Route path="/my-projects" element={<ProtectedRoute><MyProjects /></ProtectedRoute>} />
              <Route path="/my-projects/:id" element={<ProtectedRoute><MyProjectDetail /></ProtectedRoute>} />
              <Route path="/rh/candidatos" element={<RoleProtectedRoute requireManager><Candidates /></RoleProtectedRoute>} />
              <Route path="/rh/vagas" element={<RoleProtectedRoute requireManager><JobOpenings /></RoleProtectedRoute>} />
              <Route path="/trabalhe-conosco/:tenantId" element={<JobApplication />} />
              <Route path="/trabalhe-conosco/:tenantId/:vagaId" element={<JobApplicationVaga />} />
              <Route path="/estrategia" element={<RoleProtectedRoute requireManager><Strategy /></RoleProtectedRoute>} />
              <Route path="/rh/ferramentas-beneficios" element={<RoleProtectedRoute requireAdmin><BenefitsAndTools /></RoleProtectedRoute>} />
              <Route path="/rh/ferias" element={<RoleProtectedRoute requireManager><VacationManagement /></RoleProtectedRoute>} />
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
