// Development fallback values (uncomment for local testing if needed)
// export const projectId = "adnejfsqtadgitqymloj";
// export const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkbmVqZnNxdGFkZ2l0cXltbG9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3Nzk5MjMsImV4cCI6MjA3OTM1NTkyM30.zOhUqOuHaApYexqH6tibAUTcGXMLVybPTC2Arj7MrXk";

// Type definition for Vite environment variables
interface ImportMetaEnv {
  VITE_SUPABASE_PROJECT_ID: string;
  VITE_SUPABASE_ANON_KEY: string;
  // Add other environment variables as needed
}

// Check for required environment variables
const getEnvVar = (name: keyof ImportMetaEnv): string => {
  const value = import.meta.env[name];
  if (!value) {
    const errorMsg = `Missing required environment variable: ${name}`;
    console.error(errorMsg);
    // In production, this will be visible in the browser's console
    if (import.meta.env.PROD) {
      alert(`Configuration Error: ${errorMsg}. Please check your deployment settings.`);
    }
    return ''; // Return empty string to avoid runtime errors
  }
  return value;
};

export const projectId = getEnvVar('VITE_SUPABASE_PROJECT_ID');
export const publicAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');