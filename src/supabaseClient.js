// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// Reemplaza estos valores con los de tu proyecto Supabase
const SUPABASE_URL = "https://ynhgecixhglzkbnqcoxa.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluaGdlY2l4aGdsemtibnFjeHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDk4NzYsImV4cCI6MjA2OTQyNTg3Nn0.HqCY2Wc0s4cl5aYJJVIKQLh-SFewZHqlWJV5uScOnS4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
