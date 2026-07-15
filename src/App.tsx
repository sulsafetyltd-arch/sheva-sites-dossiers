import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import DossierEditor from "./pages/DossierEditor.tsx";
import DossierPreview from "./pages/DossierPreview.tsx";
import DossierReports from "./pages/DossierReports.tsx";
import SafetyReports from "./pages/SafetyReports.tsx";
import SafetyInspector from "./pages/SafetyInspector.tsx";
import SafetyReportPreview from "./pages/SafetyReportPreview.tsx";
import NotFound from "./pages/NotFound.tsx";

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
          <Route path="/safety" element={<SafetyReports />} />
          <Route path="/safety/:id" element={<SafetyInspector />} />
          <Route path="/safety/:id/report" element={<SafetyReportPreview />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
