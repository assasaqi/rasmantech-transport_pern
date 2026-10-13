const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

// 1. Ambil URL koneksi Supabase dari .env
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL tidak ditemukan pada berkas .env');
}

// 2. Buat connection pool menggunakan driver 'pg'
const pool = new Pool({ connectionString });

// 3. Inisialisasi Prisma adapter PostgreSQL
const adapter = new PrismaPg(pool);

// 4. Inisialisasi Prisma Client dengan adapter
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
