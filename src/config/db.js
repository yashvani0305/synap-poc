import { configDotenv } from "dotenv";
import postgres from "postgres";
configDotenv();
import { createClient } from "@supabase/supabase-js";

const SQL = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default SQL;
