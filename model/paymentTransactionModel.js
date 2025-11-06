const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema({
  merchantTransactionId: { type: String, required: true, index: true, unique: true },
  amount: { type: Number, required: true }, // stored in paisa/lowest unit or as you prefer
  merchantUserId: { type: String },
  phonepeTransactionId: { type: String },
  status: {
    type: String,
    enum: ["INITIATED", "PENDING", "SUCCESS", "FAILED", "UNKNOWN"],
    default: "INITIATED",
  },
  providerResponse: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

paymentTransactionSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("PaymentTransaction", paymentTransactionSchema);
