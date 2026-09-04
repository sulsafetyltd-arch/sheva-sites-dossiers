import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import DossierEditor from "./pages/DossierEditor.tsx";
import DossierPreview from "./pages/DossierPreview.tsx";
import DossierReports from "./pages/DossierReports.tsx";
import NotFound from "./pages/NotFound.tsx";
import SafetyAuditIndex from "./pages/safety-audit/SafetyAuditIndex.tsx";
import SafetyAuditEditor from "./pages/safety-audit/SafetyAuditEditor.tsx";
import SafetyAuditPreview from "./pages/safety-audit/SafetyAuditPreview.tsx";
import RealEstateLayout from "./components/real-estate/RealEstateLayout.tsx";
import RealEstateDashboard from "./pages/real-estate/RealEstateDashboard.tsx";
import DealList from "./pages/real-estate/DealList.tsx";
import DealEditor from "./pages/real-estate/DealEditor.tsx";
import CalendarPage from "./pages/real-estate/CalendarPage.tsx";
import ClientsPage from "./pages/real-estate/ClientsPage.tsx";
import AlertsPage from "./pages/real-estate/AlertsPage.tsx";
import UsersPage from "./pages/real-estate/UsersPage.tsx";
import PackagesPage from "./pages/real-estate/PackagesPage.tsx";
import HelpPage from "./pages/real-estate/HelpPage.tsx";
import TrainingOverview from "./pages/real-estate/TrainingOverview.tsx";
import TrainingModulePage from "./pages/real-estate/TrainingModulePage.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/editor/:id" element={<DossierEditor />} />
          <Route path="/preview/:id" element={<DossierPreview />} />
          <Route path="/reports/:id" element={<DossierReports />} />
          {/* Safety Audit module */}
          <Route path="/safety" element={<SafetyAuditIndex />} />
          <Route path="/safety/editor/:id" element={<SafetyAuditEditor />} />
          <Route path="/safety/preview/:id" element={<SafetyAuditPreview />} />
          <Route path="/real-estate" element={<RealEstateLayout />}>
            <Route index element={<RealEstateDashboard />} />
            <Route path="deals" element={<DealList />} />
            <Route path="deals/:id" element={<DealEditor />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="packages" element={<PackagesPage />} />
            <Route path="training" element={<TrainingOverview />} />
            <Route path="training/:moduleId" element={<TrainingModulePage />} />
            <Route path="help" element={<HelpPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
