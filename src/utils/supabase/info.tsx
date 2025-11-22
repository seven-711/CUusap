// export const projectId = "adnejfsqtadgitqymloj";
// export const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkbmVqZnNxdGFkZ2l0cXltbG9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3Nzk5MjMsImV4cCI6MjA3OTM1NTkyM30.zOhUqOuHaApYexqH6tibAUTcGXMLVybPTC2Arj7MrXk";


export const projectId = process.env.VITE_SUPABASE_PROJECT_ID!;
export const publicAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;