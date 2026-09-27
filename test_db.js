import sql from './api/_lib/db.js';

async function main() {
  const users = await sql`SELECT id, email, name, auth_provider, status, role FROM users`;
  console.log(users);
  process.exit(0);
}
main();
