const express = require("express");
const router = express.Router();

const {
  getFileGarbage,
  deleteFileGarbage,
  postFileGarbageAndDeleteBank
} = require("../controllers/fileController");

router.get("/", getFileGarbage);

router.delete("/",deleteFileGarbage)

router.post('/' ,postFileGarbageAndDeleteBank)
module.exports = router;