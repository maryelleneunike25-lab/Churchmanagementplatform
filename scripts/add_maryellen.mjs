import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function addAdmin() {
  await sql`
    INSERT INTO users (email, name, status, role, permissions, auth_provider)
    VALUES ('maryelleneunike25@gmail.com', 'Maryellen Eunike', 'approved', 'super_admin', '{"can_manage_users": true}', 'keduanya')
    ON CONFLICT (email) DO UPDATE SET role = 'super_admin', status = 'approved', permissions = '{"can_manage_users": true}', auth_provider = 'keduanya'
  `;
  await sql`
    INSERT INTO auth_allowlist (email)
    VALUES ('maryelleneunike25@gmail.com')
    ON CONFLICT DO NOTHING
  `;
  console.log('Successfully added maryelleneunike25@gmail.com as super_admin');
  process.exit(0);
}

addAdmin();
