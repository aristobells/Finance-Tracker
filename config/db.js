import pg from "pg";
import env from "dotenv";
env.config();

// const db = new pg.Client({
//   user: process.env.PG_USER,
//   host: process.env.PG_HOST,
//   database: process.env.PG_DATABASE,
//   password: process.env.PG_PASSWORD,
//   port: process.env.PG_PORT,
// });

// db.connect()
//   .then(() => console.log('📦 Connected to PostgreSQL'))
//   .catch((err) => console.error('❌ Connection error:', err));


// Render
const { Client } = pg;

// Use DATABASE_URL directly
const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required on Render for external connections
  },
});

db.connect()
  .then(() => console.log("📦 Connected to PostgreSQL"))
  .catch((err) => console.error("❌ Connection error:", err));

export default db;