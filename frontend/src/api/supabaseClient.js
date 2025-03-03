import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vpzmsuldpbfxmgqllwbc.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwem1zdWxkcGJmeG1ncWxsd2JjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDQyNDY5MywiZXhwIjoyMDU2MDAwNjkzfQ.Ghjquhm59sqIs3ITtrT-c5uVPggIIegKicph7bDAGjk"
// ✅ Check if API keys exist
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("🚨 Missing Supabase API credentials!");
  alert("Error: Supabase is not configured. Please check your API Key.");
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey);
