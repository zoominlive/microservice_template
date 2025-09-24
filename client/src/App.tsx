import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/hooks/use-toast";
import { getUserFromToken, isAuthenticated } from "@/lib/auth-utils";
import { TokenSwitcher } from "@/components/token-switcher";
import { setPermissionOverrides } from "@/lib/permission-utils";

// Import pages
import HomePage from "@/pages/HomePage";
import SettingsPage from "@/pages/SettingsPage";

// Contexts - we'll create simplified versions
import { CustomLabelsProvider } from "@/contexts/CustomLabelsContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";

function Router() {
  const [location, setLocation] = useLocation();
  const user = getUserFromToken();
  
  // Redirect to home if not authenticated
  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-turquoise/20 to-sky-blue/20 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-turquoise to-sky-blue bg-clip-text text-transparent mb-4">
              Authentication Required
            </h1>
            <p className="text-gray-600 mb-6">
              Please authenticate with a valid JWT token to access this microservice.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Development Mode:</strong> Use the Token Switcher in the bottom-right corner to select a user role for testing.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/settings" component={SettingsPage} />
      
      {/* Add more routes as needed for your microservice */}
      
      {/* 404 Page */}
      <Route>
        <div className="flex flex-col items-center justify-center h-screen py-20">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            404 - Page Not Found
          </h1>
          <p className="text-gray-600 mb-8">
            The page you're looking for doesn't exist.
          </p>
          <a
            href="/"
            className="px-4 py-2 bg-coral-red text-white rounded-md hover:bg-coral-red/90"
          >
            Go Home
          </a>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    // Initialize iframe authentication on app start (if in iframe)
    const initializeIframeAuth = () => {
      // Check if we're in an iframe
      if (window.parent !== window) {
        // Listen for auth messages from parent
        window.addEventListener('message', (event) => {
          if (event.data.type === 'AUTH_TOKEN') {
            localStorage.setItem('authToken', event.data.token);
            window.dispatchEvent(new Event('authChanged'));
          }
        });
        
        // Request auth token from parent
        window.parent.postMessage({ type: 'REQUEST_AUTH_TOKEN' }, '*');
      }
    };
    
    initializeIframeAuth();
    
    // Fetch and cache permission overrides
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      // Fetch permission overrides
      fetch('/api/permissions/overrides', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
        .then(res => res.json())
        .then(overrides => {
          if (Array.isArray(overrides)) {
            setPermissionOverrides(overrides);
          }
        })
        .catch(err => console.warn('Could not load permission overrides:', err));
    }
    
    setAuthLoaded(true);
    
    // Listen for auth changes
    const handleAuthChange = () => {
      window.location.reload();
    };
    
    window.addEventListener('authChanged', handleAuthChange);
    
    return () => {
      window.removeEventListener('authChanged', handleAuthChange);
    };
  }, []);

  if (!authLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <FavoritesProvider>
        <CustomLabelsProvider>
          <TooltipProvider>
            <ToastProvider>
              <Toaster />
              <Router />
              <TokenSwitcher />
            </ToastProvider>
          </TooltipProvider>
        </CustomLabelsProvider>
      </FavoritesProvider>
    </QueryClientProvider>
  );
}

export default App;