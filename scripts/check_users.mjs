import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_MrsRLhB3Zmy5@ep-weathered-math-b48091qo-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function test() {
  try {
    const users = await sql`SELECT id, email, name, role, status, auth_provider, (password_hash IS NOT NULL) as has_password, google_id FROM users`;
    console.log(users);
  } catch (e) {
    console.error(e);
  }
}
test();
