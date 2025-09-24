import { createContext, useContext, ReactNode } from "react";

// Simplified custom labels context for the microservice template
// Replace with your microservice-specific terminology if needed

interface CustomLabelsContextType {
  getLabel: (key: string) => string;
}

const CustomLabelsContext = createContext<CustomLabelsContextType>({
  getLabel: (key: string) => key,
});

export function CustomLabelsProvider({ children }: { children: ReactNode }) {
  // Default labels - customize for your microservice
  const labels: Record<string, string> = {
    item: "Item",
    items: "Items",
    feature: "Feature",
    features: "Features",
  };

  const getLabel = (key: string): string => {
    return labels[key] || key;
  };

  return (
    <CustomLabelsContext.Provider value={{ getLabel }}>
      {children}
    </CustomLabelsContext.Provider>
  );
}

export function useCustomLabels() {
  const context = useContext(CustomLabelsContext);
  if (!context) {
    throw new Error("useCustomLabels must be used within CustomLabelsProvider");
  }
  return context;
}