import { NavigationTabs } from "@/components/navigation-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <NavigationTabs defaultTab="home">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Microservice Template</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                This is the home page of your microservice. Replace this content with your application features.
              </p>
            </CardContent>
          </Card>
        </div>
      </NavigationTabs>
    </div>
  );
}