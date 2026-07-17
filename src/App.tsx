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
import SafetyClientReports from "./pages/safety-audit/SafetyClientReports.tsx";
import SafetyLogin from "./pages/safety-audit/SafetyLogin.tsx";
import SafetyUserManagement from "./pages/safety-audit/SafetyUserManagement.tsx";
import SafetyUserProfile from "./pages/safety-audit/SafetyUserProfile.tsx";
import SafetyTrainingClient from "./pages/safety-training/SafetyTrainingClient.tsx";
import SafetyTrainingEditor from "./pages/safety-training/SafetyTrainingEditor.tsx";
import SafetyTrainingPreview from "./pages/safety-training/SafetyTrainingPreview.tsx";
import RequireSafetyAuth from "./components/safety/RequireSafetyAuth.tsx";
import RequireSafetyAdmin from "./components/safety/RequireSafetyAdmin.tsx";
import { SafetyAuthProvider } from "./contexts/SafetyAuthContext.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <SafetyAuthProvider>
          <Routes>
            <Route path="/" element={<RequireSafetyAuth><Index /></RequireSafetyAuth>} />
            <Route path="/editor/:id" element={<RequireSafetyAuth><DossierEditor /></RequireSafetyAuth>} />
            <Route path="/preview/:id" element={<RequireSafetyAuth><DossierPreview /></RequireSafetyAuth>} />
            <Route path="/reports/:id" element={<RequireSafetyAuth><DossierReports /></RequireSafetyAuth>} />
            <Route path="/safety/login" element={<SafetyLogin />} />
            <Route path="/safety" element={<RequireSafetyAuth><SafetyAuditIndex /></RequireSafetyAuth>} />
            <Route path="/safety/users" element={<RequireSafetyAuth><RequireSafetyAdmin><SafetyUserManagement /></RequireSafetyAdmin></RequireSafetyAuth>} />
            <Route path="/safety/profile" element={<RequireSafetyAuth><SafetyUserProfile /></RequireSafetyAuth>} />
            <Route path="/safety/client/:clientId" element={<RequireSafetyAuth><SafetyClientReports /></RequireSafetyAuth>} />
            <Route path="/safety/editor/:id" element={<RequireSafetyAuth><SafetyAuditEditor /></RequireSafetyAuth>} />
            <Route path="/safety/preview/:id" element={<RequireSafetyAuth><SafetyAuditPreview /></RequireSafetyAuth>} />
            <Route path="/safety/training/client/:clientId" element={<RequireSafetyAuth><SafetyTrainingClient /></RequireSafetyAuth>} />
            <Route path="/safety/training/editor/:id" element={<RequireSafetyAuth><SafetyTrainingEditor /></RequireSafetyAuth>} />
            <Route path="/safety/training/preview/:id" element={<RequireSafetyAuth><SafetyTrainingPreview /></RequireSafetyAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SafetyAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
