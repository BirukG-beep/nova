const Bank = require("../models/Bank");
const cloudinary = require("../cloudinaryConfig");
const LastPayment = require("../models/lastPayment")
const { toEthiopian } = require("ethiopian-date");
const lastPayment = require("../models/lastPayment");
const User = require("../models/user");
const pool = require('../db')
const { v4: uuidv4 } = require("uuid");
// Create Bank
exports.createBank = async (req, res) => {
  const client = await pool.connect();
  try {
    const { bankName, to, accountNumber, userId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: "Image is required" });
    }

    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "banks",
    });

        const bankId = uuidv4();
    // 1️⃣ Insert into banks table
    const insertBankQuery = `
      INSERT INTO banks (id , bank_name, "to", account_number, image_url, user_id)
      VALUES ($1, $2, $3, $4, $5 , $6)
      RETURNING *;
    `;

    const bankResult = await client.query(insertBankQuery, [
      bankId,
      bankName,
      to,
      accountNumber,
      result.secure_url,
      userId,
    ]);

    const bank = bankResult.rows[0];

    // 2️⃣ Ethiopian date
    const today = new Date();
    const [year] = toEthiopian(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate()
    );

    // 3️⃣ Check if last_payment exists
    const checkQuery = `
      SELECT * FROM last_payments WHERE user_id = $1 AND year = $2
    `;
    const checkResult = await client.query(checkQuery, [userId, year.toString()]);

    // 4️⃣ Insert if not exists
    if (checkResult.rows.length === 0) {
      const insertLastPaymentQuery = `
        INSERT INTO last_payments (id, user_id, year)
        VALUES ($1, $2, $3)
      `;
      await client.query(insertLastPaymentQuery, [uuidv4(), userId, year.toString()]);
    }

    res.status(201).json({ success: true, bank });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
};
// Get All Banks
exports.getBanks = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM banks`);
    const banks = result.rows; // pg returns rows in .rows
    res.status(200).json({ success: true, banks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Toggle Visibility
exports.toggleVisibility = async (req, res) => {
  try {
    let { id } = req.params;

    // Remove accidental leading colon
    if (id.startsWith(':')) id = id.slice(1);
    console.log(id)

    // PostgreSQL ID is numeric (SERIAL/BIGINT)
    if (!id) {

      console.log("ok these is not valid id")
      return res.status(400).json({
        success: false,
        error: "Invalid bank ID format"
      });
    }

    // Toggle visibility in one query
    const result = await pool.query(
      `UPDATE banks
       SET visibility = NOT visibility
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Bank not found" });
    }

    res.status(200).json({ success: true, bank: result.rows[0] });

  } catch (error) {
    console.error("Toggle visibility error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete Bank
exports.deleteBank = async (req, res) => {
  try {
    const { id } = req.params;
    const bank = await Bank.findByIdAndDelete(id);
    if (!bank) return res.status(404).json({ success: false, error: "Bank not found" });
    res.status(200).json({ success: true, message: "Bank deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getUserBanks = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log('User ID:', userId);

    // Query banks table in PostgreSQL
    const result = await pool.query(
      'SELECT * FROM banks WHERE user_id = $1',
      [userId]
    );

    const banks = result.rows;

    if (!banks || banks.length === 0) {
      return res.status(404).json({ message: 'No banks found for this user' });
    }

    res.status(200).json(banks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};