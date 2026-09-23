const mongoose = require("mongoose");
const { toEthiopian } = require("ethiopian-date");

// Function to generate Ethiopian year automatically
const getCurrentEthiopianYear = () => {
  const today = new Date();
  const [ethYear] = toEthiopian(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );
  return ethYear.toString();
};

const UserPayment = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,

    months: {
      type: Array,
      required: true,
      default: [
        { month: "Meskerem", status: "-" },
        { month: "Tikimt", status: "-" },
        { month: "Hidar", status: "-" },
        { month: "Tahsas", status: "-" },
        { month: "Tir", status: "-" },
        { month: "Yekatit", status: "-" },
        { month: "Megabit", status: "-" },
        { month: "Miazia", status: "-" },
        { month: "Ginbot", status: "-" },
        { month: "Sene", status: "-" },
        { month: "Hamle", status: "-" },
        { month: "Nehase", status: "-" }
      ]
    },

    year: {
      type: String,
      default: getCurrentEthiopianYear
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", UserPayment);