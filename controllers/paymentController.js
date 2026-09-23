const pool = require("../db");
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



exports.getPaymentStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId } = req.params;

    const query = `
      SELECT * FROM payments
      WHERE user_id = $1
    `;

    const result = await client.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    // If one record per user → take first row
    const payment = result.rows;

    res.status(200).json({
      success: true,
      payment,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  } finally {
    client.release();
  }
};



exports.getAllPayments = async (req, res) => {
  const client = await pool.connect();

  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Year query parameter is required",
      });
    }

    const ethYear = year.toString();

    // 1. Get ALL users
    const usersResult = await client.query(`
      SELECT id, first_name, last_name, phone, register_date
      FROM users
    `);

    const users = usersResult.rows;

    // 2. Get payments that already exist for this year
    const paymentsResult = await client.query(
      `
      SELECT *
      FROM payments
      WHERE eth_year = $1
      `,
      [ethYear]
    );

    const existingPayments = paymentsResult.rows;

    // 3. Create a quick lookup:
    // userId -> payment
    const paymentMap = new Map();

    existingPayments.forEach((payment) => {
      paymentMap.set(payment.user_id, payment);
    });

    // 4. Create payment for users who don't have one
    for (const user of users) {
      if (!paymentMap.has(user.id)) {
        const paymentId = uuidv4();

        const months = generateMonths();

        const insertPaymentQuery = `
          INSERT INTO payments (
            id,
            user_id,
            months,
            eth_year
          )
          VALUES (
            $1,
            $2,
            $3::jsonb,
            $4
          )
          RETURNING *
        `;

        const result = await client.query(
          insertPaymentQuery,
          [
            paymentId,
            user.id,
            JSON.stringify(months),
            ethYear
          ]
        );

        // Add newly-created payment to our map
        paymentMap.set(user.id, result.rows[0]);
      }
    }

    // 5. Return ALL payments for this year
    const allPayments = Array.from(paymentMap.values());

    return res.status(200).json({
      success: true,
      count: allPayments.length,
      payments: allPayments,
    });

  } catch (err) {
    console.error("getAllPayments error:", err);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });

  } finally {
    client.release();
  }
};


// PUT /api/updatePaymentStatus
const MONTHS = [
  "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit",
  "Megabit", "Miazia", "Ginbot", "Sene", "Hamle", "Nehase",
];

exports.updatePaymentStatus = async (req, res) => {

  try {
    const { userId, month, newStatus, ethYear: year } = req.body.userId; // ✅ fixed: destructure from req.body, not req.body.userId

    if (!userId || !month || !year || !newStatus) {
      return res.status(400).json({
        message: "userId, month, newStatus and ethYear are required",
      });
    }

    // IMPORTANT:
    // Find ONLY this user's payment record for this specific Ethiopian year
    const result = await pool.query(
      `SELECT * FROM payments WHERE user_id = $1 AND eth_year = $2`,
      [userId, year]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: `No payment record found for user ${userId} and year ${year}`,
      });
    }

    const payment = result.rows[0];

    // Get the months JSON
    let months = payment.months;

    // Update ONLY the requested month
    let found = false;
    months = months.map((m) => {
      if (m.month === month) {
        found = true;
        return {
          ...m,
          status: newStatus,
        };
      }
      return m;
    });

    if (!found) {
      return res.status(404).json({
        message: `Month ${month} not found for Ethiopian year ${year}`,
      });
    }

    // Save the updated months for THIS user + THIS year
    await pool.query(
      `UPDATE payments SET months = $1, updated_at = NOW() WHERE user_id = $2 AND eth_year = $3`,
      [JSON.stringify(months), userId, year]
    );


    return res.status(200).json({
      message: "Payment status updated successfully",
      userId,
      month,
      status: newStatus,
      ethYear: year,
    });
  } catch (err) {
    console.error("updatePaymentStatus error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

exports.getLastyear = async (req, res) => {

  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { ethYear } = req.query;

    if (!ethYear) {
      return res.status(400).json({
        success: false,
        message: "ethYear is required",
      });
    }

    const year = Number(ethYear);

    if (!Number.isInteger(year)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ethYear",
      });
    }

    const query = `
      SELECT
        p.eth_year,
        month->>'month' AS month
      FROM payments p
      CROSS JOIN LATERAL jsonb_array_elements(p.months) AS month
      WHERE p.user_id = $1
        AND p.eth_year::INTEGER <= $2
        AND month->>'status' = '✔'
      ORDER BY
        p.eth_year::INTEGER DESC,
        CASE month->>'month'
          WHEN 'Meskerem' THEN 1
          WHEN 'Tikimt' THEN 2
          WHEN 'Hidar' THEN 3
          WHEN 'Tahsas' THEN 4
          WHEN 'Tir' THEN 5
          WHEN 'Yekatit' THEN 6
          WHEN 'Megabit' THEN 7
          WHEN 'Miazia' THEN 8
          WHEN 'Ginbot' THEN 9
          WHEN 'Sene' THEN 10
          WHEN 'Hamle' THEN 11
          WHEN 'Nehase' THEN 12
          WHEN 'Pagume' THEN 13
        END DESC
      LIMIT 1
    `;

    const result = await client.query(query, [id, year]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        year: null,
        month: null,
        message: "No payment year with a ✔ found",
      });
    }

    const lastYear = Number(result.rows[0].eth_year);
    const lastMonth = result.rows[0].month;

    return res.status(200).json({
      success: true,
      year: lastYear,
      month: lastMonth,
    });

  } catch (error) {
    console.error("Error getting last year:", error);

    return res.status(500).json({
      success: false,
      year: null,
      month: null,
      message: "Server Error",
    });

  } finally {
    client.release();
  }
};