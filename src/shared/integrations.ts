export interface IntegrationDetails {
  id: string;
  name: string;
  description: string;
  icon: string; // Path to icon or icon component name
  websiteUrl?: string;
  envVarName?: string;
}

export const VERCEL_INTEGRATION_DETAILS: IntegrationDetails = {
  id: "vercel",
  name: "Vercel",
  description: "Deploy your apps directly to Vercel.",
  icon: "/assets/vercel/vercel-logo.svg", // Placeholder, replace with actual path
  websiteUrl: "https://vercel.com/account/tokens",
  envVarName: "VERCEL_ACCESS_TOKEN",
};

// Add other integrations here as needed
export const INTEGRATION_PROVIDERS: IntegrationDetails[] = [
  VERCEL_INTEGRATION_DETAILS,
];