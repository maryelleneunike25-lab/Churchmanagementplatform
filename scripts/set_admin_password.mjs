import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon('postgresql://neondb_owner:npg_MrsRLhB3Zmy5@ep-weathered-math-b48091qo-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function setPassword(email, newPassword) {
  if (!email || !newPassword) {
    console.error('Usage: node scripts/set_admin_password.mjs <email> <password>');
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPassword, 10);
  const updated = await sql`
    UPDATE users 
    SET password_hash = ${hash}, auth_provider = 'keduanya', status = 'approved', role = 'super_admin'
    WHERE email = ${email.toLowerCase()}
    RETURNING id, email, name, role, status, auth_provider
  `;

  if (updated.length === 0) {
    console.error(`User with email ${email} not found.`);
    process.exit(1);
  }

  console.log('Password updated successfully for:', updated[0]);
  process.exit(0);
}

const email = process.argv[2] || 'maryelleneunike25@gmail.com';
const password = process.argv[3];

if (!password) {
  console.log('Usage: node scripts/set_admin_password.mjs <email> <password>');
} else {
  setPassword(email, password);
}
