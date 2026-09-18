import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_MrsRLhB3Zmy5@ep-weathered-math-b48091qo-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function test() {
  try {
    const users = await sql`SELECT id, email, name, auth_provider, created_at, status FROM users WHERE status = 'pending' ORDER BY created_at DESC`;
    console.log(users);
  } catch (e) {
    console.error(e);
  }
}
test();
