const ReviewModel = require("../model/ReviewModel");
const ProductModel = require("../model/ProductModel");
const ErrorHandler = require("../utils/errorHandler");
const asyncWrapper = require("../middleWare/asyncWrapper");
const cloudinary = require("cloudinary");
const mongoose = require("mongoose");

// 1. Create or Update Review
exports.createOrUpdateReview = asyncWrapper(async (req, res, next) => {
  // Ensure user is authenticated
  if (!req.user || !req.user._id) {
    return next(new ErrorHandler("Please login to create or update a review", 401));
  }

  console.log("====== Incoming Review Request ======");
  console.log("BODY:", req.body);
  console.log("FILES:", req.files);
  console.log("====================================");

  const { productId, ratings, comment, title, recommend } = req.body;
  const userId = req.user._id;

  let images = [];

  // ✅ 1️⃣ Handle FormData uploads (req.files)
  if (req.files && req.files.length > 0) {
    for (let file of req.files) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.v2.uploader.upload_stream(
          { folder: "ReviewImages" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(file.buffer);
      });
      images.push({ public_id: result.public_id, url: result.secure_url });
    }
  }

  // ✅ 2️⃣ Handle Base64 images sent via application/json
  else if (req.body.images && Array.isArray(req.body.images)) {
    for (const img of req.body.images) {
      if (typeof img === "string" && img.startsWith("data:")) {
        // Upload Base64 to Cloudinary
        const result = await cloudinary.v2.uploader.upload(img, {
          folder: "ReviewImages",
        });
        images.push({ public_id: result.public_id, url: result.secure_url });
      } else if (typeof img === "string") {
        // already an image URL
        images.push({ url: img });
      } else if (img && img.url) {
        images.push({ url: img.url });
      }
    }
  }

  // ✅ 3️⃣ Find existing review by user + product
  let review = await ReviewModel.findOne({ product: productId, user: userId });

  if (review) {
    // Update existing review
    review.ratings = ratings;
    review.comment = comment;
    review.title = title;
    review.recommend = recommend;

    // Replace images if new ones provided
    if (images && images.length > 0) {
      if (Array.isArray(review.images) && review.images.length > 0) {
        for (let img of review.images) {
          if (img.public_id) {
            try {
              await cloudinary.v2.uploader.destroy(img.public_id);
            } catch (err) {
              console.error("Error deleting old review image:", err.message);
            }
          }
        }
      }
      review.images = images;
    }
    await review.save();
  } else {
    // Create new review
    review = await ReviewModel.create({
      product: productId,
      user: userId,
      ratings,
      comment,
      title,
      recommend,
      images,
      avatar: req.user.avatar?.url,
      name: req.user.name,
    });
  }

  // ✅ 4️⃣ Update product stats
  const reviews = await ReviewModel.find({ product: productId }).populate("user", "name avatar");
  const numOfReviews = reviews.length;
  const avgRating =
    numOfReviews === 0
      ? 0
      : reviews.reduce((acc, r) => acc + Number(r.ratings || 0), 0) / numOfReviews;

  await ProductModel.findByIdAndUpdate(productId, {
    numOfReviews,
    ratings: avgRating,
  });

  res.status(200).json({ success: true, review });
});


// 2. Get All Reviews for a Product
exports.getProductReviews = asyncWrapper(async (req, res, next) => {
  const { productId } = req.query;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return next(new ErrorHandler("Invalid product ID", 400));
  }
  const reviews = await ReviewModel.find({ product: productId }).populate("user", "name avatar");
  res.status(200).json({ success: true, reviews });
});

// 3. Delete Review
exports.deleteReview = asyncWrapper(async (req, res, next) => {
  // Ensure user is authenticated before proceeding
  if (!req.user || !req.user._id) {
    return next(new ErrorHandler("Please login to delete a review", 401));
  }

  const { reviewId, productId } = req.query;
  const review = await ReviewModel.findById(reviewId);
  if (!review) return next(new ErrorHandler("Review not found", 404));

  // Only admin or review owner can delete
  if (
    req.user.role !== "admin" &&
    review.user.toString() !== req.user._id.toString()
  ) {
    return next(new ErrorHandler("Not authorized to delete this review", 403));
  }

  // delete review images from Cloudinary if public_id available
  if (Array.isArray(review.images) && review.images.length > 0) {
    for (let img of review.images) {
      if (img && img.public_id) {
        try {
          await cloudinary.v2.uploader.destroy(img.public_id);
        } catch (err) {
          console.error("Error deleting review image on delete:", err.message || err);
        }
      }
    }
  }

  await review.deleteOne();

  // Update product's numOfReviews and average rating
  const reviews = await ReviewModel.find({ product: productId });
  const numOfReviews = reviews.length;
  const avgRating =
    numOfReviews === 0
      ? 0
      : reviews.reduce((acc, r) => acc + r.ratings, 0) / numOfReviews;

  await ProductModel.findByIdAndUpdate(productId, {
    numOfReviews,
    ratings: avgRating,
  });

  res.status(200).json({ success: true, message: "Review deleted" });
});

// 4. Find Single Review (by ID)
exports.findReview = asyncWrapper(async (req, res, next) => {
  const { reviewId } = req.params;
  const review = await ReviewModel.findById(reviewId).populate("user", "name avatar");
  if (!review) return next(new ErrorHandler("Review not found", 404));
  res.status(200).json({ success: true, review });
});

// 5. Upload Review Images
exports.uploadReviewImages = asyncWrapper(async (req, res, next) => {
  let imageLinks = [];
  for (let file of req.files) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.v2.uploader.upload_stream(
        { folder: "ReviewImages" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(file.buffer);
    });
    imageLinks.push({ public_id: result.public_id, url: result.secure_url });
  }
  res.status(200).json({ success: true, images: imageLinks });
});

// 6. Like or Dislike Review
exports.likeDislikeReview = asyncWrapper(async (req, res, next) => {
  const { reviewId, action } = req.body;
  const review = await ReviewModel.findById(reviewId);
  if (!review) return next(new ErrorHandler("Review not found", 404));

  if (!review.likes) review.likes = [];
  if (!review.dislikes) review.dislikes = [];

  if (action === "like") {
    // Remove from dislikes if present
    review.dislikes = review.dislikes.filter(
      (id) => id.toString() !== req.user._id.toString()
    );
    // Add to likes if not present
    if (!review.likes.includes(req.user._id)) {
      review.likes.push(req.user._id);
    }
  } else if (action === "dislike") {
    // Remove from likes if present
    review.likes = review.likes.filter(
      (id) => id.toString() !== req.user._id.toString()
    );
    // Add to dislikes if not present
    if (!review.dislikes.includes(req.user._id)) {
      review.dislikes.push(req.user._id);
    }
  }

  await review.save();
  res.status(200).json({
    success: true,
    likes: review.likes.length,
    dislikes: review.dislikes.length,
    review, // Optionally return the updated review
  });
});
 