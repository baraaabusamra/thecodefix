import "dotenv/config";
import { neon } from "@neondatabase/serverless";

// Assign any RBAC role to a user by email (generalizes make-owner.mjs).
// Usage: npm run set-role -- someone@example.com marketing
// (The person must sign in through the app once so the user row exists.)

const ROLES = [
  "student",
  "support",
  "writer",
  "sales",
  "operations",
  "marketing",
  "designer",
  "admin",
  "owner",
];

const [email, role] = process.argv.slice(2);

if (!email || !ROLES.includes(role)) {
  console.error(`Usage: npm run set-role -- <email> <${ROLES.join("|")}>`);
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = neon(url);
const rows = await sql`
  UPDATE "user" SET role = ${role}
  WHERE email = ${email}
  RETURNING email, name, role
`;

if (rows.length === 0) {
  console.error(
    `No user found with email "${email}". Sign in through the app once, then retry.`
  );
  process.exit(1);
}

console.log(`✓ ${rows[0].email} (${rows[0].name}) is now: ${rows[0].role}`);
