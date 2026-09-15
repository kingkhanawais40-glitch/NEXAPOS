const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "store.db");

const db = new Database(dbPath);

console.log("SQLite database connected successfully!");

module.exports = db;