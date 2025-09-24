import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Home,
  FileText,
  FolderOpen,
  Package,
  Settings,
} from "lucide-react";
import { getUserFromToken } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/permission-utils";
import { useLocation } from "wouter";

interface NavigationTabsProps {
  children: React.ReactNode;
  defaultTab?: string;
}

export function NavigationTabs({
  children,
  defaultTab = "home",
}: NavigationTabsProps) {
  const user = getUserFromToken();
  const [location, setLocation] = useLocation();
  
  // Check permissions for different tabs
  const canAccessPlaceholder1 = hasPermission("feature1.access");
  const canAccessPlaceholder2 = hasPermission("feature2.access");
  const canAccessPlaceholder3 = hasPermission("feature3.access");
  const canAccessSettings = hasPermission("settings.access");

  // Calculate grid columns based on available tabs
  let gridColsCount = 1; // home is always visible
  if (canAccessPlaceholder1) gridColsCount++;
  if (canAccessPlaceholder2) gridColsCount++;
  if (canAccessPlaceholder3) gridColsCount++;

  // Use static classes for Tailwind CSS purging
  const gridColsClass =
    gridColsCount === 1
      ? "grid-cols-1"
      : gridColsCount === 2
        ? "grid-cols-2"
        : gridColsCount === 3
          ? "grid-cols-3"
          : gridColsCount === 4
            ? "grid-cols-4"
            : "grid-cols-4";

  return (
    <Tabs defaultValue={defaultTab} className="space-y-6">
      <Card className="shadow-sm">
        <CardContent className="p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <TabsList
                className={`grid w-full ${gridColsClass} bg-white dark:bg-gray-800 p-1 rounded-lg h-12`}
              >
                <TabsTrigger
                  value="home"
                  className="flex items-center justify-center h-10 px-4 rounded-md font-semibold transition-all duration-300 text-gray-700 dark:text-gray-300 hover:bg-coral-red/20 hover:text-coral-red dark:hover:bg-coral-red/20 dark:hover:text-coral-red data-[state=active]:!bg-coral-red data-[state=active]:!text-white data-[state=active]:shadow-lg"
                  data-testid="tab-home"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </TabsTrigger>
                
                {canAccessPlaceholder1 && (
                  <TabsTrigger
                    value="placeholder1"
                    className="flex items-center justify-center h-10 px-4 rounded-md font-semibold transition-all duration-300 text-gray-700 dark:text-gray-300 hover:bg-turquoise/20 hover:text-turquoise dark:hover:bg-turquoise/20 dark:hover:text-turquoise data-[state=active]:!bg-turquoise data-[state=active]:!text-white data-[state=active]:shadow-lg"
                    data-testid="tab-placeholder1"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Place Holder 1
                  </TabsTrigger>
                )}
                
                {canAccessPlaceholder2 && (
                  <TabsTrigger
                    value="placeholder2"
                    className="flex items-center justify-center h-10 px-4 rounded-md font-semibold transition-all duration-300 text-gray-700 dark:text-gray-300 hover:bg-sky-blue/20 hover:text-sky-blue dark:hover:bg-sky-blue/20 dark:hover:text-sky-blue data-[state=active]:!bg-sky-blue data-[state=active]:!text-white data-[state=active]:shadow-lg"
                    data-testid="tab-placeholder2"
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Place Holder 2
                  </TabsTrigger>
                )}
                
                {canAccessPlaceholder3 && (
                  <TabsTrigger
                    value="placeholder3"
                    className="flex items-center justify-center h-10 px-4 rounded-md font-semibold transition-all duration-300 text-gray-700 dark:text-gray-300 hover:bg-mint-green/20 hover:text-mint-green dark:hover:bg-mint-green/20 dark:hover:text-mint-green data-[state=active]:!bg-mint-green data-[state=active]:!text-white data-[state=active]:shadow-lg"
                    data-testid="tab-placeholder3"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Place Holder 3
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
            
            {canAccessSettings && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation("/settings")}
                    data-testid="button-settings"
                    className="h-10 px-3 text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tab Contents - Only home tab has content */}
      <TabsContent value="home" className="space-y-6">
        {children}
      </TabsContent>

      {/* Empty placeholder tabs - no content */}
      <TabsContent value="placeholder1" className="space-y-6" />
      <TabsContent value="placeholder2" className="space-y-6" />
      <TabsContent value="placeholder3" className="space-y-6" />
    </Tabs>
  );
}