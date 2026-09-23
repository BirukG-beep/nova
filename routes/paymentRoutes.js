const express = require("express");
const router = express.Router();

const {
  getPaymentStatus,
  updatePaymentStatus,
  getAllPayments,
  getLastyear
} = require("../controllers/paymentController");

router.get("/:userId", getPaymentStatus);

router.post("/",getAllPayments)
router.put("/updatePaymentStatus", updatePaymentStatus);
router.get("/:id/lastyear", getLastyear);
module.exports = router;