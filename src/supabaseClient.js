import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zmgdbiveaniwzkzefywm.supabase.co";
const supabaseKey = "sb_publishable_YBSutdmMEcSVsu0_f7Uvdg_SMKR_Weh";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce"
  }
});
