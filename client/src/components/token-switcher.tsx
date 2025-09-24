import * as React from "react";
import { User, ChevronDown, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

// JWT test secret - this should match the server's JWT_SECRET
const TEST_JWT_SECRET = "dev-secret-key-for-testing-only";

// Function to create test JWT tokens
function createTestJWT(payload: any): string {
  // Simple JWT creation for development (normally you'd use jsonwebtoken library)
  const header = { alg: "HS256", typ: "JWT" };
  const headerEncoded = btoa(JSON.stringify(header)).replace(/=/g, '');
  const payloadEncoded = btoa(JSON.stringify(payload)).replace(/=/g, '');
  
  // For development, we'll create a simple signature (not cryptographically secure)
  // In a real app, you'd use proper HMAC-SHA256
  const data = headerEncoded + "." + payloadEncoded;
  const signature = btoa(TEST_JWT_SECRET + data).replace(/=/g, '');
  
  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

// Test user configurations - tokens will be generated dynamically
const TEST_USERS = {
  admin: {
    label: "Admin User",
    role: "Admin",
    username: "admin@example.com",
    userId: "admin-123",
    tenantId: "dev_tenant_001",
    locations: ["Main Campus", "North Branch"],
  },
  teacher: {
    label: "Teacher User",
    role: "Teacher",
    username: "teacher@example.com", 
    userId: "teacher-456",
    tenantId: "dev_tenant_001",
    locations: ["Main Campus"],
  },
  director: {
    label: "Director User",
    role: "Director",
    username: "director@example.com",
    userId: "director-789",
    tenantId: "dev_tenant_001",
    locations: ["Main Campus", "North Branch"],
  },
  assistant_director: {
    label: "Assistant Director",
    role: "assistant_director",
    username: "assistant_director@example.com",
    userId: "asst_dir-012",
    tenantId: "dev_tenant_001",
    locations: ["Main Campus"],
  },
  superadmin: {
    label: "Super Admin User",
    role: "SuperAdmin",
    username: "superadmin@example.com",
    userId: "superadmin-345",
    tenantId: "dev_tenant_001",
    locations: ["Main Campus", "North Branch", "South Campus"],
  },
  parent: {
    label: "Parent User",
    role: "Parent",
    username: "parent@example.com",
    userId: "parent-678",
    tenantId: "dev_tenant_001",
    locations: ["Main Campus"],
  },
};

// Generate tokens for each user
const TEST_TOKENS = Object.fromEntries(
  Object.entries(TEST_USERS).map(([key, user]) => [
    key,
    {
      ...user,
      token: createTestJWT({
        userId: user.userId,
        userFirstName: user.label.split(' ')[0],
        userLastName: user.label.split(' ')[1] || 'User',
        username: user.username,
        role: user.role,
        tenantId: user.tenantId,
        locations: user.locations,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      })
    }
  ])
);

type UserType = keyof typeof TEST_TOKENS;

export function TokenSwitcher() {
  const [currentUser, setCurrentUser] = React.useState<UserType>("teacher");
  const { toast } = useToast();

  const setAuthToken = (token: string) => {
    localStorage.setItem("authToken", token);
    
    // Also set as session auth for API calls
    if (typeof window !== "undefined") {
      // Trigger custom event for auth change
      window.dispatchEvent(new CustomEvent("authChanged", { detail: { token } }));
    }
  };

  const clearAuthToken = () => {
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");
  };

  const switchUser = (userType: UserType) => {
    const user = TEST_TOKENS[userType];

    // Clear the existing auth token
    clearAuthToken();

    // Set the new token
    setAuthToken(user.token);
    setCurrentUser(userType);

    // Mark that the token was manually set
    localStorage.setItem("tokenManuallySet", "true");

    toast({
      title: "User Switched",
      description: `Now logged in as ${user.role}: ${user.username}`,
    });

    // Reload to ensure all components reset with new auth state
    window.location.reload();
  };

  // Only show in development mode
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="shadow-lg border-2 bg-white"
            data-testid="token-switcher-trigger"
          >
            <User className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline-block">
              {TEST_TOKENS[currentUser].label}
            </span>
            <span className="sm:hidden">User</span>
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Switch Test User
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {Object.entries(TEST_TOKENS).map(([key, user]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => switchUser(key as UserType)}
              className={currentUser === key ? "bg-accent" : ""}
              data-testid={`token-switcher-${key}`}
            >
              <User className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span>{user.label}</span>
                <span className="text-xs text-muted-foreground">
                  {user.username}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}