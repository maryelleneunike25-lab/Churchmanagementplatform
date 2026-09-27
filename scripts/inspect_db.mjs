import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function inspect() {
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log('Tables:', tables.map(t => t.table_name));

  const allUsers = await sql`SELECT id, email, name, role, status, auth_provider, created_at FROM users`;
  console.log('All Users in DB:', allUsers);

  try {
    const allowlist = await sql`SELECT * FROM auth_allowlist`;
    console.log('Allowlist:', allowlist);
  } catch (e) {}
}

inspect();
