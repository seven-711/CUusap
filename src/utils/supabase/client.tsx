import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "./info";

let client: SupabaseClient | null = null;

// Validate configuration on import
if (!projectId || !publicAnonKey) {
  console.error("Supabase configuration is missing. Please check your environment variables.");
}

export function createClient(): SupabaseClient {
  if (client) {
    return client;
  }

  if (!projectId || !publicAnonKey) {
    throw new Error(
      "Supabase client initialization failed: Missing required configuration. " +
      "Please check your environment variables (VITE_SUPABASE_PROJECT_ID and VITE_SUPABASE_ANON_KEY)."
    );
  }

  try {
    const supabaseUrl = `https://${projectId}.supabase.co`;
    client = createSupabaseClient(supabaseUrl, publicAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    
    // Test the connection
    client.auth.onAuthStateChange((event, session) => {
      console.log('Supabase auth state changed:', event, session);
    });

    return client;
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    throw new Error("Failed to initialize Supabase client. Please check your configuration.");
  }
}

// Initialize the client immediately when this module is imported
try {
  createClient();
} catch (error) {
  console.error("Initial Supabase client initialization failed:", error);
}
