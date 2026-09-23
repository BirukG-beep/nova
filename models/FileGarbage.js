const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  bankName: { type: String, required: true, trim: true },
  to: { type: String, required: true, trim: true },
  accountNumber: { type: String, required: true, trim: true },
  imageUrl: { type: String, required: true },
  visibility: { type: Boolean, default: true },
  userId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

module.exports = mongoose.model("File", fileSchema);