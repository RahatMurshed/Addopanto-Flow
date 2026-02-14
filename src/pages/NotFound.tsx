import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import gaLogo from "@/assets/GA-LOGO.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center space-y-4">
        <Link to="/"><img src={gaLogo} alt="Grammar Addopanto" className="mx-auto h-16 w-auto object-contain" /></Link>
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
