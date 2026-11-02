const mongoose = require("mongoose");
const dns = require("dns");

try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
  // Ignore if DNS server override fails in restricted environments
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is missing");
    }

    cached.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    }).then((m) => {
      console.log("MongoDB Connected Successfully!");
      return m;
    }).catch((err) => {
      cached.promise = null;
      console.error("MongoDB Connection Error:", err.message);
      throw err;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;

