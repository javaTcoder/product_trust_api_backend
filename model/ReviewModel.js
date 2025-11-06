// backend/model/ReviewModel.js
const mongoose = require("mongoose");
const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.ObjectId, ref: "ProductModel", index: true },
  user: { type: mongoose.Schema.ObjectId, ref: "userModel", index: true },
  title: String,
  comment: String,
  ratings: Number,
  recommend: Boolean,
  images: [
    {
      url: { type: String, required: true },
      public_id: { type: String }, // optional, for Cloudinary
    }
  ],
  likes: [{ type: mongoose.Schema.ObjectId, ref: "userModel" }],
  dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "userModel" }],
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  replies: [{ type: mongoose.Schema.ObjectId, ref: "Review" }],
  parentId: { type: mongoose.Schema.ObjectId, ref: "Review", default: null },
  createdAt: { type: Date, default: Date.now },
});


const reviewModel  = mongoose.model("Review" , reviewSchema);
module.exports = reviewModel;