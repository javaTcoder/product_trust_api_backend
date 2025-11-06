const asyncWrapper = require("../middleWare/asyncWrapper");
const axios = require("axios");
const crypto = require("crypto");
const { v4: uuidv4 } = require('uuid');
const PaymentTransaction = require("../model/paymentTransactionModel");
const Razorpay = require("razorpay");

// process the payment
exports.processPayment = asyncWrapper(async (req, res, next) => {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // asigning key as well

  const myPayment = await stripe.paymentIntents.create({
    amount: req.body.amount,
    currency: "inr",
    description: "Order payment for Product Trust Store", // <-- Add this line
    metadata: {
      company: "Ecommerce", // not mandatory
    },
  });

  res
    .status(200)
    .json({ success: true, client_secret: myPayment.client_secret });
});

// send STRIPE_API_KEY to user =>

exports.sendStripeApiKey = asyncWrapper(async (req, res, next) => {
  res.status(200).json({ stripeApiKey: process.env.STRIPE_API_KEY });
});



// Replace phonepePayment and add phonepeReturn
exports.phonepePayment = async (req, res) => {
  console.log("[PhonePe] Incoming req.body:", req.body);
  const { merchantTransactionId, amount, userPhone, redirectUrl, merchantUserId } = req.body;

  if (!process.env.PHONEPE_MERCHANT_ID || !process.env.PHONEPE_SALT_KEY) {
    console.error("[PhonePe] Missing PHONEPE_MERCHANT_ID or PHONEPE_SALT_KEY in environment");
    return res.status(500).json({
      error: "PhonePe configuration missing. Ensure PHONEPE_MERCHANT_ID and PHONEPE_SALT_KEY are set.",
    });
  }

  const merchantUser = userPhone || merchantUserId || req.body.merchant_user_id || null;
  const missing = [];
  if (!merchantTransactionId) missing.push("merchantTransactionId");
  if (!amount && amount !== 0) missing.push("amount");
  if (!merchantUser) missing.push("userPhone / merchantUserId");
  if (!redirectUrl) missing.push("redirectUrl");
  if (missing.length) {
    console.error("[PhonePe] Missing required field(s):", missing);
    return res.status(400).json({ error: `Missing required field(s): ${missing.join(", ")}` });
  }

  // create DB record so we can show history immediately
  let txn;
  try {
    txn = await PaymentTransaction.create({
      merchantTransactionId,
      amount: Math.round(amount * 100),
      merchantUserId: merchantUser,
      status: "INITIATED",
    });
  } catch (dbErr) {
    console.error("[PhonePe] Failed to create transaction record:", dbErr);
    // continue, but note that we couldn't persist
  }

  const payload = {
    merchantId: process.env.PHONEPE_MERCHANT_ID,
    merchantTransactionId,
    amount: Math.round(amount * 100),
    merchantUserId: merchantUser,
    redirectUrl,
    paymentInstrument: { type: "PAY_PAGE" },
  };

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
  const saltKey = process.env.PHONEPE_SALT_KEY;
  const requestPath = "/pg/v1/pay";
  const keyIndex = process.env.PHONEPE_KEY_INDEX || "1";
  const xVerify =
    crypto.createHash("sha256").update(base64Payload + requestPath + saltKey).digest("hex") + "###" + keyIndex;

  const phonepeApiUrl = process.env.PHONEPE_API_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";

  try {
    const { data } = await axios.post(
      phonepeApiUrl,
      { request: base64Payload },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerify,
          "X-KEY-INDEX": keyIndex,
        },
        timeout: 15000,
      }
    );

    // update DB with provider response and set PENDING
    try {
      if (txn) {
        txn.providerResponse = data;
        txn.status = "PENDING";
        await txn.save();
      }
    } catch (updErr) {
      console.warn("[PhonePe] Failed updating txn after initiate:", updErr);
    }

    return res.status(200).json(data);
  } catch (error) {
    const remote = error.response?.data || null;
    console.error("[PhonePe] Payment error:", remote || error.message || error);

    // update DB txn to FAILED/UNKNOWN
    try {
      if (txn) {
        txn.providerResponse = remote || { message: error.message };
        txn.status = "FAILED";
        await txn.save();
      }
    } catch (updErr) {
      console.warn("[PhonePe] Failed updating txn on error:", updErr);
    }

    if (error.code === "ENOTFOUND" || (error.message && error.message.includes("ENOTFOUND"))) {
      return res.status(502).json({
        error: "PHONEPE_HOST_UNREACHABLE",
        message: `Unable to reach PhonePe host (${phonepeApiUrl}). Check network/DNS or PHONEPE_API_URL env var.`,
        details: error.message,
      });
    }

    if (remote && remote.code === "KEY_NOT_CONFIGURED") {
      return res.status(400).json({
        error: "KEY_NOT_CONFIGURED",
        message:
          "PhonePe key not configured for this merchant. Check PHONEPE_MERCHANT_ID and PHONEPE_SALT_KEY and environment (sandbox vs production).",
        details: remote,
      });
    }

    return res.status(error.response?.status || 500).json({ error: remote || error.message || "Unknown error" });
  }
};
 
// This endpoint receives PhonePe redirect (GET/POST), checks status with PhonePe, and redirects user to frontend success/failure
exports.phonepeReturn = async (req, res) => {
  console.log("[PhonePe:return] called. method:", req.method);
  console.log("[PhonePe:return] query:", req.query);
  console.log("[PhonePe:return] body keys:", Object.keys(req.body || {}));

  const merchantTransactionId =
    req.query.merchantTransactionId ||
    req.query.merchanttransactionid ||
    req.query.id ||
    req.body.merchantTransactionId ||
    req.body.id ||
    (req.body && req.body.request && (() => {
      try {
        const parsed = JSON.parse(Buffer.from(req.body.request, "base64").toString("utf8"));
        return parsed.merchantTransactionId || parsed.id || null;
      } catch (e) {
        return null;
      }
    })()) ||
    null;

  console.log("[PhonePe:return] resolved merchantTransactionId:", merchantTransactionId);
  const frontendBase = process.env.FRONTEND_URL || "http://localhost:3000";
  if (!merchantTransactionId) {
    console.error("[PhonePe:return] No merchantTransactionId received — redirecting to failure.");
    return res.redirect(`${frontendBase}/process/payment/failure`);
  }

  if (!process.env.PHONEPE_MERCHANT_ID || !process.env.PHONEPE_SALT_KEY) {
    console.error("[PhonePe:return] PhonePe not configured on server");
    return res.redirect(`${frontendBase}/process/payment/failure`);
  }

  const merchantId = process.env.PHONEPE_MERCHANT_ID;
  const keyIndex = process.env.PHONEPE_KEY_INDEX || "1";
  const saltKey = process.env.PHONEPE_SALT_KEY;
  const requestPath = `/pg/v1/status/${merchantId}/${merchantTransactionId}`;
  const phonepeStatusUrl =
    process.env.PHONEPE_STATUS_URL ||
    `https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status/${merchantId}/${merchantTransactionId}`;

  const sha256 = crypto.createHash("sha256").update(requestPath + saltKey).digest("hex");
  const xVerify = sha256 + "###" + keyIndex;

  try {
    const { data } = await axios.get(phonepeStatusUrl, {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
        "X-KEY-INDEX": keyIndex,
        "X-MERCHANT-ID": merchantId,
      },
      timeout: 15000,
    });

    console.log("[PhonePe:return] status API response:", data);

    // update DB record with latest provider response & status
    try {
      const txn = await PaymentTransaction.findOne({ merchantTransactionId });
      if (txn) {
        txn.providerResponse = data;
        // try to map provider response to our status enum
        const providerStatus =
          data && data.data && data.data.status
            ? data.data.status.toUpperCase()
            : data && data.success
            ? "SUCCESS"
            : "FAILED";
        if (providerStatus === "SUCCESS") txn.status = "SUCCESS";
        else if (providerStatus === "PENDING") txn.status = "PENDING";
        else txn.status = "FAILED";
        // capture provider transaction id if present
        if (data && data.data && data.data.transactionId) txn.phonepeTransactionId = data.data.transactionId;
        await txn.save();
      } else {
        console.warn("[PhonePe:return] No DB transaction found for", merchantTransactionId);
      }
    } catch (dbErr) {
      console.warn("[PhonePe:return] Failed to update DB txn:", dbErr);
    }

    const success = data && (data.success === true || (data.data && data.data.status === "SUCCESS"));
    if (success) return res.redirect(`${frontendBase}/process/payment/success`);
    return res.redirect(`${frontendBase}/process/payment/failure`);
  } catch (error) {
    console.error("[PhonePe:return] status check failed:", error.message || error);
    try {
      await PaymentTransaction.findOneAndUpdate(
        { merchantTransactionId },
        { status: "UNKNOWN", providerResponse: error.response?.data || { message: error.message } },
        { new: true }
      );
    } catch (u) {
      console.warn("[PhonePe:return] failed to mark txn as UNKNOWN:", u);
    }
    return res.redirect(`${frontendBase}/process/payment/failure`);
  }
};

// GET /api/v1/payment/transactions?merchantUserId=...  (for user)
exports.getUserTransactions = asyncWrapper(async (req, res, next) => {
  const merchantUserId = req.query.merchantUserId || req.params.merchantUserId || (req.user && req.user.id);
  if (!merchantUserId) return res.status(400).json({ success: false, message: "merchantUserId required" });
  const transactions = await PaymentTransaction.find({ merchantUserId }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: transactions.length, transactions });
});

// GET /api/v1/payment/transactions/all  (admin)
exports.getAllTransactions = asyncWrapper(async (req, res, next) => {
  const transactions = await PaymentTransaction.find({}).sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: transactions.length, transactions });
});

// Ensure Razorpay env variables are present
if (!process.env.Razorpay_Test_Key_ID || !process.env.Razorpay_Test_Key_Secret) {
  throw new Error("Razorpay_Test_Key_ID or Razorpay_Test_Key_Secret is missing in environment variables");
}

const razorpay = new Razorpay({
  key_id: process.env.Razorpay_Test_Key_ID,
  key_secret: process.env.Razorpay_Test_Key_Secret,
});

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const options = {
      amount: amount, // amount in paisa
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      payment_capture: 1,
    };
    const order = await razorpay.orders.create(options);
    res.status(200).json({ order_id: order.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
