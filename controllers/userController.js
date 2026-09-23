const User = require("../models/user");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const pool = require("../db"); // pg Pool instance
const { v4: uuidv4 } = require("uuid"); // add this at top of file

// Helper to generate 4-digit code
const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();
const ETH_MONTHS = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miazia",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagume"
];

const { toEthiopian } = require("ethiopian-date");

const getCurrentEthiopianDate = () => {
  const today = new Date();
  const [ethYear, ethMonth] = toEthiopian(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );

  return { ethYear, ethMonth }; // ethMonth is 1–13
};

const generateMonths = () => {
  const { ethMonth } = getCurrentEthiopianDate();

  return ETH_MONTHS.map((monthName, index) => {
    return {
      month: monthName,
      status: index + 1 < ethMonth ? "X" : "-"
    };
  });
};

const getCurrentEthiopianYear = () => {
  const today = new Date();
  const [ethYear] = toEthiopian(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );
  return ethYear.toString();
};


// REGISTER

exports.registerUser = async (req, res) => {
  const client = await pool.connect();
  try {
    const { firstName, lastName, phone, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      
      console.log("passoword is not match")
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Check if user exists
    const existing = await client.query("SELECT * FROM users WHERE phone=$1", [phone]);
    if (existing.rows.length > 0) {
      console.log("user already exist")
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate UUID for new user
    const userId = uuidv4();

    // Insert user with UUID
    const insertUserQuery = `
      INSERT INTO users (id, first_name, last_name, phone, password)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, first_name, last_name, phone, register_date;
    `;
    const { rows } = await client.query(insertUserQuery, [userId, firstName, lastName, phone, hashedPassword]);
    const user = rows[0];

    console.log(user);

    // Insert payment with JSONB months
    const months = generateMonths();
    const ethYear = getCurrentEthiopianYear();

// Generate UUID for payment
const paymentId = uuidv4();

const insertPaymentQuery = `
  INSERT INTO payments (id, user_id, months, eth_year)
  VALUES ($1, $2, $3::jsonb, $4)
`;

await client.query(insertPaymentQuery, [paymentId, user.id, JSON.stringify(months), ethYear]);

    res.status(201).json({ message: "User registered successfully", user });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  } finally {
    client.release();
  }
};

// LOGIN
// LOGIN - PostgreSQL version
exports.loginUser = async (req, res) => {
  const client = await pool.connect();
  try {
    const { identifier, password } = req.body; // phone or identifier

    if (!identifier || !password)
      return res.status(400).json({ message: "Identifier and password required" });

    // Query user from PostgreSQL
    const result = await client.query(
      "SELECT * FROM users WHERE phone = $1",
      [identifier]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ message: "User not found" });

    const user = result.rows[0];

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid password" });

    // Remove password before sending response
    delete user.password;

    console.log(user)

    res.status(200).json({ status: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Server Error" });
  } finally {
    client.release();
  }
};

// FORGOT PASSWORD (Send code to email)

exports.getUsers = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT id, first_name, last_name, phone, register_date FROM users");
    res.status(200).json({ users: result.rows });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });

  } finally {
    client.release();
  }
};
// GET SINGLE USER - PostgreSQL
exports.getUser = async (req, res) => {

  console.log("we are here")

  console.log(req.params)
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(
      "SELECT id, first_name, last_name, phone, register_date FROM users WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = result.rows[0];

    res.status(200).json({
      success: true,
      user,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};
exports.forgotPassword1 = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) return res.status(400).json({ message: "Phone is required" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Generate 4-digit code
    const code = generateCode();
    user.resetCode = code;
    user.resetCodeExpiry = Date.now() + 10 * 60 * 1000; // expires in 10 min
    await user.save();

    // SEND CODE VIA EMAIL
    // configure transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "your_email@gmail.com", // replace with your email
        pass: "your_app_password",    // Gmail App Password recommended
      },
    });

    const mailOptions = {
      from: "your_email@gmail.com",
      to: user.email,
      subject: "Your Password Reset Code",
      text: `Your password reset code is: ${code}`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Reset code sent to email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// CHECK CODE
exports.checkCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({
      email,
      resetCode: code,
    });

    if (!user) return res.status(400).json({ message: "Invalid code" });

    // Delete code after verification
    user.resetCode = null;
    user.resetCodeExpiry = null;
    await user.save();

    res.status(200).json({ message: "Code verified successfully", valid: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.deleteUser = async (req, res) => {
  console.log("deleteUser called with body:", req.body);

  const client = await pool.connect();

  try {
    const { id } = req.body;

    await client.query("BEGIN");

    // 1. Delete from all dependent tables
    await client.query(`DELETE FROM payments WHERE user_id = $1`, [id]);
    await client.query(`DELETE FROM last_payments WHERE user_id = $1`, [id]);
    await client.query(`DELETE FROM banks WHERE user_id = $1`, [id]); // if exists

    // 2. Delete user
    const result = await client.query(
      `DELETE FROM users WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "User not found" });
    }

    await client.query("COMMIT");

    res.status(200).json({
      message: "User and all related data deleted successfully",
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  } finally {
    client.release();
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and new password are required" });
    }

    // 1️⃣ Check if user exists
    const userResult = await pool.query(
      `SELECT * FROM users WHERE phone = $1`,
      [phone]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    // 2️⃣ Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Update password in database
    await pool.query(
      `UPDATE users SET password = $1 WHERE phone = $2`,
      [hashedPassword, phone]
    );

    res.status(200).json({ message: "Password reset successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.registerAll = async (req, res) => {
  try {
    const registered = req.body;
    console.log("registerAll called with data:", registered);

    // 1️⃣ Get all existing users & payments
    const usersResult = await pool.query(`SELECT * FROM users`);
    const paymentsResult = await pool.query(`SELECT * FROM payments`);

    const users = usersResult.rows;

    const payments = paymentsResult.rows;

    console.log("we reached payment")

    // 2️⃣ Identify users to move to user_garbage (those NOT in new registered list)
    const registeredIds = new Set(registered.map(u => u.id)); // ids from frontend
    const usersToArchive = users.filter(u => !registeredIds.has(u.id));
     const ethYear = getCurrentEthiopianYear();

    for (const u of usersToArchive) {
      await pool.query(
        `INSERT INTO user_garbage 
         (id, first_name, last_name, phone, password, deleted_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.first_name, u.last_name, u.phone, u.password, ethYear]
      );


      console.log("step 2")
      // Optionally, also move their payments to garbage
      const updatePayment = payments.filter(p => p.user_id !== u.id);
      for (const payment of updatePayment) {
        await pool.query(
          `UPDATE payments SET  eth_year = $1`,
          [ (Number(payment.eth_year) + 1).toString()]
        );
           }
      const userPayments = payments.filter(p => p.user_id === u.id);
      for (const payment of userPayments) {
        await pool.query(
          `INSERT INTO garbage (id, data, created_at )
           VALUES ($1, $2, $3 )
           ON CONFLICT (id) DO NOTHING`,
          [payment.id, JSON.stringify(payment), new Date()  ]
        );
      }
    }

    console.log("step 3")

    // 3️⃣ Delete archived users and their payments
 // 3️⃣ Delete archived users and their payments
const archiveIds = usersToArchive.map(u => u.id);

console.log("these is also archiveids" , archiveIds);

if (archiveIds.length > 0) {
  // 1️⃣ Move last_payments to last_payments_garbage
  const lastPayments = await pool.query(
    `SELECT * FROM last_payments WHERE user_id = ANY($1)`,
    [archiveIds]
  );

  for (const lp of lastPayments.rows) {
    await pool.query(
      `INSERT INTO last_payments_garbage 
       (id, user_id, year, created_at , updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [lp.id, lp.user_id,  lp.year, lp. created_at   , lp.updated_at]
    );
  }


  console.log("Archive IDs:", archiveIds);


  // 2️⃣ Delete last_payments rows
  await pool.query(`DELETE FROM last_payments WHERE user_id = ANY($1)`, [archiveIds]);

  // 3️⃣ Delete related banks rows
  await pool.query(`DELETE FROM banks WHERE user_id = ANY($1)`, [archiveIds]);

  // 4️⃣ Delete payments rows
  await pool.query(`DELETE FROM payments WHERE user_id = ANY($1)`, [archiveIds]);

  // 5️⃣ Finally delete users
  await pool.query(`DELETE FROM users WHERE id = ANY($1)`, [archiveIds]);
}
    // 4️⃣ Remove duplicate phones in incoming list
    const uniqueUsers = [...new Map(registered.map(u => [u.phone, u])).values()];

    // 5️⃣ Insert/update new users
    for (const userData of uniqueUsers) {
      const password =
        userData.password?.startsWith("$2b$")
          ? userData.password
          : await bcrypt.hash(userData.password || "default123", 10);

      await pool.query(
        `INSERT INTO users (id, first_name, last_name, phone, password)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE
         SET first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name,
             phone = EXCLUDED.phone,
             password = EXCLUDED.password`,
        [userData.id, userData.first_name, userData.last_name, userData.phone, password]
      );

      // Insert new payment
      await pool.query(
        `INSERT INTO payments (id , user_id, months , eth_year)
         VALUES ($1, $2, $3 , $4)`,
        [uuidv4(),userData.id, JSON.stringify(generateMonths()) , getCurrentEthiopianYear()]
      );
    }

    res.status(200).json({ message: "Users and payments migrated and registered successfully" });

  } catch (error) {
    console.error("registerAll Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
exports.getGarbageUser = async (req, res) => {
  try {
    // Query user_garbage table
    const usersGarbageResult = await pool.query('SELECT * FROM user_garbage');
    const usersGarbage = usersGarbageResult.rows;

    // Query garbage table
    const garbageResult = await pool.query('SELECT * FROM garbage');
    const GarbagePayment = garbageResult.rows;

    res.status(200).json({
      users: usersGarbage,
      garbage: GarbagePayment,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.deleteGarbagteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete the user from user_garbage table
    const result = await pool.query(
      `DELETE FROM user_garbage WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};