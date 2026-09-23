const mongoose = require("mongoose");

const lastPaymentSchema = new mongoose.Schema({
  year: {type: String, required:true },
  userId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

module.exports = mongoose.model("lastPayment", lastPaymentSchema);