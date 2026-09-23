const express = require("express");
const cors = require("cors");

require("dotenv").config();

// routes
const userRoutes = require("./routes/userRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const bankRoutes = require("./routes/bankRoutes");
const fileRoutes = require("./routes/fileRoutes");

const app = express();

// middleware
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:3000",          // for local development
      "http://novafitnesscenter.com",   // deployed frontend
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS" , "PATCH"],
    credentials: true, // if your frontend sends cookies or auth headers
  })
);

// routes
app.use("/api/auth", userRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/banks", bankRoutes);
app.use("/api/file", fileRoutes);

// ✅ Server listen
const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);