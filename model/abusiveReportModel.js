const mongoose = require("mongoose");

const abusiveReportSchema = new mongoose.Schema({
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Review" },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductModel" },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "userModel" },
  reason: { type: String, required: true },
  comment: { type: String }, // The abusive/inappropriate content
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AbusiveReport", abusiveReportSchema);
