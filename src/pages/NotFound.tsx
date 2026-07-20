import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Migrate broken/old deep links to the resilient query-param form.
    const match = location.pathname.match(/^\/(?:t|safety\/trade-risk)\/([^/]+)\/?$/i);
    if (match?.[1]) {
      const token = match[1].replace(/[)\].,;!?״"']+$/g, "");
      window.location.replace(`/?tr=${encodeURIComponent(token)}`);
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
