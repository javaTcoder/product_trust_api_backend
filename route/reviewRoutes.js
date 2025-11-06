const express  = require("express");
const router  = express.Router();

const { getProductReviews, deleteReview, createOrUpdateReview,uploadReviewImages,likeDislikeReview, findReview } = require("../controller/reviewController");
const { isAuthentictedUser } = require("../middleWare/auth");

const upload = require("../utils/upload");

router.route("/review/upload-images")
  .post(isAuthentictedUser, upload.array("images", 5), uploadReviewImages);
router.route("/review/new/json").post(isAuthentictedUser, createOrUpdateReview);
//router.route("/review/new").put(isAuthentictedUser, upload.array("images", 5), createOrUpdateReview);

router.post("/review/new",isAuthentictedUser, upload.array("images", 5), createOrUpdateReview);

router.route("/reviews").get(getProductReviews);
router.route("/product/reviews/delete").delete(isAuthentictedUser, deleteReview);
// Get a single review by ID
router.get("/review/:reviewId", findReview);
router.route("/review/like-dislike")
  .post(isAuthentictedUser, likeDislikeReview);

module.exports = router;