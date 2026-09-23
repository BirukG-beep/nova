const mongoose = require("mongoose");

const garbageSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,

  data: [
    {
      months: {
        type: Object,   // or Map if you want key-value months
        required: true
      },
      year: {
        type: String,
        required: true
      }
    }
  ]
});

module.exports = mongoose.model("Garbage", garbageSchema);