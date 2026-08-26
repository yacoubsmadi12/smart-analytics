import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useRoute } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ModulePage from "./pages/ModulePage";
import IntelligenceMapPage from "./pages/IntelligenceMapPage";
import NetworkPage from "./pages/NetworkPage";
import CustomerExperiencePage from "./pages/CustomerExperiencePage";
import CustomersPage from "./pages/CustomersPage";
import ComplaintsPage from "./pages/ComplaintsPage";
import InfrastructureFiberPage from "./pages/InfrastructureFiberPage";
import SalesPage from "./pages/SalesPage";
import MarketingPage from "./pages/MarketingPage";
import BusinessRevenuePage from "./pages/BusinessRevenuePage";
import PrioritiesPage from "./pages/PrioritiesPage";
import AIAssistantPage from "./pages/AIAssistantPage";
import AlertsPage from "./pages/AlertsPage";
import ReportsPage from "./pages/ReportsPage";
import SystemSettingsPage from "./pages/SystemSettingsPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import SyntheticDemoPage from "./pages/SyntheticDemoPage";
import { useAuth } from "@/_core/hooks/useAuth";

function ModuleRoute() { const [, params] = useRoute("/:module"); const slug = params?.module || "network"; if (slug === "synthetic-demo") return <SyntheticDemoPage />; if (slug === "intelligence-map") return <IntelligenceMapPage />; if (slug === "network") return <NetworkPage />; if (slug === "customer-experience") return <CustomerExperiencePage />; if (slug === "customers") return <CustomersPage />; if (slug === "complaints") return <ComplaintsPage />; if (slug === "infrastructure-fiber") return <InfrastructureFiberPage />; if (slug === "sales") return <SalesPage />; if (slug === "marketing") return <MarketingPage />; if (slug === "business-revenue") return <BusinessRevenuePage />; if (slug === "priorities") return <PrioritiesPage />; if (slug === "ai-assistant") return <AIAssistantPage />; if (slug === "alerts") return <AlertsPage />; if (slug === "reports") return <ReportsPage />; if (slug === "system-settings") return <SystemSettingsPage />; if (slug === "audit-logs") return <AuditLogsPage />; return <ModulePage slug={slug}/>; }

function Router() {
  const [isLoginRoute] = useRoute("/login");
  const { user, loading } = useAuth();
  if (isLoginRoute) return <Login/>;
  if (loading) return <div className="auth-loading"><div className="brand-mark"><span/><span/><span/></div><span>Loading secure workspace…</span></div>;
  return <Switch><Route path="/login" component={Login}/>{user ? <><Route path="/" component={Home}/><Route path="/:module" component={ModuleRoute}/></> : <><Route path="/" component={Login}/><Route path="/:module" component={Login}/></>}<Route path="/404" component={NotFound}/><Route component={NotFound}/></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster theme="dark"/><Router/></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
