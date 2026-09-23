const mongoose = require("mongoose");

const bankSchema = new mongoose.Schema({
  bankName: { type: String, required: true, trim: true },
  to: { type: String, required: true, trim: true },
  accountNumber: { type: String, required: true, trim: true },
  imageUrl: { type: String, required: true },
  visibility: { type: Boolean, default: true },
  userId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

module.exports = mongoose.model("Bank", bankSchema);