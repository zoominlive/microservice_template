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

// Test tokens for different user roles
// Generate these using JWT.io or your auth service
const TEST_TOKENS = {
  admin: {
    label: "Admin User",
    token: "YOUR_ADMIN_TOKEN_HERE",
    role: "Admin",
    username: "admin@example.com",
  },
  teacher: {
    label: "Teacher User",
    token: "YOUR_TEACHER_TOKEN_HERE",
    role: "Teacher",
    username: "teacher@example.com",
  },
  director: {
    label: "Director User",
    token: "YOUR_DIRECTOR_TOKEN_HERE",
    role: "Director",
    username: "director@example.com",
  },
  assistant_director: {
    label: "Assistant Director",
    token: "YOUR_ASSISTANT_DIRECTOR_TOKEN_HERE",
    role: "assistant_director",
    username: "assistant_director@example.com",
  },
  superadmin: {
    label: "Super Admin User",
    token: "YOUR_SUPERADMIN_TOKEN_HERE",
    role: "SuperAdmin",
    username: "superadmin@example.com",
  },
  parent: {
    label: "Parent User",
    token: "YOUR_PARENT_TOKEN_HERE",
    role: "Parent",
    username: "parent@example.com",
  },
};

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