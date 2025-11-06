// ------------------------------
// ✅ app.js
// ------------------------------
const express = require("express");
const app = express();
const errorMiddleware = require("./middleWare/error");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const fileUpload = require("express-fileupload"); // ✅ for review uploads
// const path = require("path");

// ✅ Parse cookies first (used in authentication middleware)
app.use(cookieParser());

// ✅ Global JSON and URL-encoded parsers (for all routes like profile/product updates)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ✅ Enable multipart/form-data parsing globally (for reviews with images)
app.use(
  fileUpload({
    useTempFiles: true, // temporary file storage
    tempFileDir: "/tmp/",
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  })
);

// ✅ CORS configuration (allow frontend connection)
const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:3000";
app.use(cors({ origin: frontendOrigin, credentials: true }));

// ✅ Import all routes
const user = require("./route/userRoute");
const order = require("./route/orderRoute");
const product = require("./route/productRoute");
const payment = require("./route/paymentRoute");
const emailVerification = require("./route/emailVerificationRoute");
const review = require("./route/reviewRoutes");
const support = require("./route/supportRoute");
const abusiveReport = require("./route/abusiveReportRoute");

// ✅ Use routes
app.use("/api/v1", emailVerification);
app.use("/api/v1", product);
app.use("/api/v1", user);
app.use("/api/v1", order);
app.use("/api/v1", payment);
app.use("/api/v1", review);
app.use("/api/v1", support);
app.use("/api/v1", abusiveReport);

// ✅ Error middleware must come after all routes
app.use(errorMiddleware);

module.exports = app;
