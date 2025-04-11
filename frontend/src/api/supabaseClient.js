import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lsxeozlhxgzhngskzizn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzeGVvemxoeGd6aG5nc2t6aXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzMjY0NTIsImV4cCI6MjA1NDkwMjQ1Mn0.a_fcAMl3fSV2KTFjg5chTDuYLYA9Z6Qik9bxs7tTKoM";

// ✅ Check if API keys exist
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("🚨 Missing Supabase API credentials!");
  alert("Error: Supabase is not configured. Please check your API Key.");
}

// Create and export the Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export { supabase };
