import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://efkpbpmcbkbcltapexvs.supabase.co";
const supabaseKey = "sb_publishable_axcZxi0-ULgdttBWQjCA1Q_5u0FS0tg";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);