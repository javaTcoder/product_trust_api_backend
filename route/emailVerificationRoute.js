const express = require("express");
const {
  sendVerificationEmail,
  verifyEmail,
} = require("../controller/emailVerificationController");

const router = express.Router();

// Route to send verification email
router.post("/send-verification-email", sendVerificationEmail);

// Route to verify email token
router.get("/verify-email", verifyEmail);

module.exports = router;