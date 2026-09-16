import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL);
const adminEmail = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL;

if (!adminEmail) {
  console.error("BOOTSTRAP_SUPER_ADMIN_EMAIL is not set.");
  process.exit(1);
}

async function bootstrap() {
  const hash = await bcrypt.hash('password123', 10);
  await sql`
    INSERT INTO users (email, name, password_hash, auth_provider, status, role, permissions)
    VALUES (${adminEmail}, 'Super Admin', ${hash}, 'email', 'approved', 'super_admin', '{"can_manage_users": true}')
    ON CONFLICT (email) DO UPDATE SET role = 'super_admin', status = 'approved'
  `;
  console.log(`Bootstrapped super_admin for ${adminEmail}`);
  process.exit(0);
}
bootstrap();
