import { configDotenv } from "dotenv";
import postgres from "postgres";
configDotenv();
const connectionString = process.env.DATABASE_URL;
console.log("Database -------", connectionString);
import { createClient } from "@supabase/supabase-js";

const SQL = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default SQL;
