const mongoose = require("mongoose");

const supportRequestSchema = new mongoose.Schema({
  issue: String,
  detail: String,
  language: String,
  email: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("SupportRequest", supportRequestSchema);