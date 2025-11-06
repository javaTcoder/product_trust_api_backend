const mongoose = require("mongoose");

const emailTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  expireAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: { expires: 3600 }, // Token expires after 1 hour (3600 seconds)
  },
});

module.exports = mongoose.model("EmailToken", emailTokenSchema);