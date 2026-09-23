const Garbage = require("../models/garbage");

exports.getGarbage = async (req, res) => {
  try {
    const result = await Garbage.find();
    res.status(200).json({ data: result });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteGarbage = async (req, res) => {
  try {
    const { _id } = req.body;

    const result = await Garbage.findByIdAndDelete(_id);

    if (!result) {
      return res.status(404).json({ message: "Garbage not found" });
    }

    res.status(200).json({
      message: "Garbage deleted successfully",
      data: result
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};