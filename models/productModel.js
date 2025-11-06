const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String },
  rating: { type: Number, required: true },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Please enter product name"] },
  description: { type: String, required: [true, "Please enter product description"] },
  price: { type: Number, required: [true, "Please enter product price"], default: 0 },
  ratings: { type: Number, default: 0 },
  images: [
    {
      public_id: String,
      url: String,
    },
  ],
  category: { type: String },
  stock: { type: Number, required: [true, "Please enter product stock"], maxLength: [5, "Stock cannot exceed 5 digits"], default: 1 },
  numOfReviews: { type: Number, default: 0 },
  reviews: [reviewSchema],
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  // Admin-editable discount percentage (0 - 100)
  discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
});

// Optional: helper virtual to compute discounted price per product
productSchema.methods.getDiscountedPrice = function () {
  if (!this.discountPercentage || this.discountPercentage <= 0) return this.price;
  const discounted = this.price * (1 - this.discountPercentage / 100);
  return Math.round(discounted * 100) / 100; // round to 2 decimals
};

module.exports = mongoose.model("Product", productSchema);