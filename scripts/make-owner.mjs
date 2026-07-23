import "dotenv/config";
import { neon } from "@neondatabase/serverless";

// Promote a user to the `owner` role by email.
// Usage: npm run make-owner -- you@example.com
// (Sign in through the app once first so the user row exists.)

const email = process.argv[2];

if (!email) {
  console.error("Usage: npm run make-owner -- <email>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Provision the database first.");
  process.exit(1);
}

const sql = neon(url);
const rows = await sql`
  UPDATE "user" SET role = 'owner'
  WHERE email = ${email}
  RETURNING id, email, role
`;

if (rows.length === 0) {
  console.error(
    `No user found with email "${email}". Sign in through the app once, then retry.`
  );
  process.exit(1);
}

console.log(`✓ ${rows[0].email} is now: ${rows[0].role}`);
