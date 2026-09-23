const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const bankController = require("../controllers/bankController");

router.post("/", upload.single("image"), bankController.createBank);
router.get("/", bankController.getBanks);
router.patch("/:id/visibility", bankController.toggleVisibility);
router.delete("/:id", bankController.deleteBank);
router.get("/user/:userId", bankController.getUserBanks);

module.exports = router;