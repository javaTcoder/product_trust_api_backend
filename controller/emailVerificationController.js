const crypto = require("crypto");
const userModel = require("../model/userModel");
const sendEmail = require("../utils/sendEmail");
const asyncWrapper = require("../middleWare/asyncWrapper");
const ErrorHandler = require("../utils/errorHandler");

// 1. Send verification email
exports.sendVerificationEmail = asyncWrapper(async (req, res, next) => {
  const { email } = req.body;
  const user = await userModel.findOne({ email });

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Generate token
  const verificationToken = crypto.randomBytes(32).toString("hex");
  user.emailVerificationToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
  user.emailVerificationExpire = Date.now() + 60 * 60 * 1000; // 1 hour expiry
  await user.save({ validateBeforeSave: false });

  // Verification link
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}&email=${email}`;
  const message = `Please verify your email by clicking the link: \n\n ${verifyUrl}`;

  await sendEmail({
    email: user.email,
    subject: "Email Verification",
    message,
  });

  res.status(200).json({ success: true, message: `Verification email sent to ${user.email}` });
});

// 2. Verify the token
exports.verifyEmail = asyncWrapper(async (req, res, next) => {
  const { token, email } = req.query;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await userModel.findOne({
    email,
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorHandler("Invalid or expired verification token", 400));
  }

  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Email verified successfully" });
});