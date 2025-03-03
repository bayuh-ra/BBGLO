import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vpzmsuldpbfxmgqllwbc.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwem1zdWxkcGJmeG1ncWxsd2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MjQ2OTMsImV4cCI6MjA1NjAwMDY5M30.oUuQ49LPcWjmrXITS18_EQg4-STC8cA4ETfpNIMkm0w"
// ✅ Check if API keys exist
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("🚨 Missing Supabase API credentials!");
  alert("Error: Supabase is not configured. Please check your API Key.");
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey);
