const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
// Menggunakan SERVICE_ROLE_KEY untuk bypass RLS Storage pada backend Express
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL dan kunci Supabase wajib diisi di .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
