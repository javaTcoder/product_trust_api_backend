const express = require("express");
const { processPayment, sendStripeApiKey ,phonepePayment, phonepeReturn, createRazorpayOrder, getUserTransactions, getAllTransactions} = require("../controller/paymentController");
const { isAuthentictedUser } = require("../middleWare/auth");
const router  = express.Router();


// backend/route/paymentRoute.js
router.post("/payment/phonepe", phonepePayment);

router.route("/payment/process").post(isAuthentictedUser , processPayment);

router.route("/stripeapikey").get(sendStripeApiKey);


// Initiate PhonePe payment from frontend (POST)
router.post("/phonepe", phonepePayment);

// PhonePe will redirect the user back here — accept both GET and POST
router.get("/phonepe/return", phonepeReturn);
router.post("/phonepe/return", phonepeReturn);

// Razorpay order creation route
router.post("/razorpay", createRazorpayOrder);

// Optional: transaction listing endpoints (user/admin)
router.get("/transactions", getUserTransactions); // ?merchantUserId=...
router.get("/transactions/all", getAllTransactions); // admin


module.exports = router