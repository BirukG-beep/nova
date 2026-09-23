const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, unique: true },
    password: { type: String, required: true },
    resetCode: { type: String }, // for 4-digit code
    resetCodeExpiry: { type: Date }, // optional expiration
    registerDate:{type: String, default: new Date().toLocaleDateString("en-ET")} // registration date in Ethiopian format
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);