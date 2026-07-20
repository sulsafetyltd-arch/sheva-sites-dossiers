import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Migrate broken/old deep links to the resilient query-param form.
    const tradeMatch = location.pathname.match(/^\/(?:t|safety\/trade-risk)\/([^/]+)\/?$/i);
    if (tradeMatch?.[1]) {
      const token = tradeMatch[1].replace(/[)\].,;!?״"']+$/g, "");
      window.location.replace(`/?tr=${encodeURIComponent(token)}`);
      return;
    }
    const inductionMatch = location.pathname.match(/^\/(?:i|safety\/induction)\/([^/]+)\/?$/i);
    if (inductionMatch?.[1]) {
      const token = inductionMatch[1].replace(/[)\].,;!?״"']+$/g, "");
      window.location.replace(`/?ci=${encodeURIComponent(token)}`);
      return;
    }
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-xl text-muted-foreground">העמוד לא נמצא</p>
        <a href="/safety" className="text-primary underline hover:text-primary/90">
          חזרה לאפליקציה
        </a>
      </div>
    </div>
  );
};

export default NotFound;
