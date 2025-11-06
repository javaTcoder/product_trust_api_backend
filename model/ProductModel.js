const mongoose  = require("mongoose");
const productSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please Enter prodcut name"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Please Enter prodcut description"],
  },
  price: {
    type: Number,
    required: [true, "Please Enter product Price"],
    maxLength: [8, "Price cannot exceed 9 characters"],
  },
  info: {
    type: String,
    required: [true, "Please Enter product info"],
  },

  ratings: {
    type: Number,
    default: 0,
  },
  images: [
    {
      product_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
  ],
  category: {
    type: String,
    required: [true, "Please eneter Product Category"],
  },
  Stock: {
    type: Number,
    required: [true, "please Enter product stock"],
    maxLength: [4, "Stock cannot exceed 4 characters"],
    default: 1,
  },
  numOfReviews: {
    type: Number,
    default: 0,
  },
  reviews: [
    {
      userId: {
        type: mongoose.Schema.ObjectId,
        ref: "userModel",
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      ratings: {
        type: Number,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      comment: {
        type: String,
        required: true,
      },
      recommend: {
        type: Boolean,
        default: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      avatar: {
        type: String,
        required: true,
      },
    },
  ],
  // when two admins are there. tab ye pta chalgea kiss admin ne product add kiya hai
  user: {
    type: mongoose.Schema.ObjectId, //  this is for admin who will add the prduct to the db
    ref: "userModel",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },

  // Admin-editable discount percentage (0 - 100)
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
});

// Optional: helper method to compute discounted price per product
productSchema.methods.getDiscountedPrice = function () {
  // `this.price` expected to be a Number (e.g. 499.99)
  if (!this.discountPercentage || this.discountPercentage <= 0) return this.price;
  const discounted = this.price * (1 - this.discountPercentage / 100);
  return Math.round(discounted * 100) / 100; // round to 2 decimals
};

const ProductModel  = mongoose.model("ProductModel" , productSchema);
module.exports =ProductModel