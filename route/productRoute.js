const express  = require("express");
const router  = express.Router();

const { getAllProducts, updateProductDiscount,createProduct, updateProduct, deleteProduct, getProductDetails, getAllProductsAdmin} = require("../controller/productController");
const { isAuthentictedUser, authorizeRoles } = require("../middleWare/auth");
const upload = require("../utils/upload");

 
 

router.route("/product").get(getAllProducts)
router.route("/admin/product/new").post(isAuthentictedUser, authorizeRoles("admin"), upload.array("images", 5), createProduct);
router.route("/admin/products").get(isAuthentictedUser , authorizeRoles("admin") , getAllProductsAdmin)
router.route("/admin/product/:id").put(isAuthentictedUser, authorizeRoles("admin"), upload.array("images", 5), updateProduct)
.delete(isAuthentictedUser, authorizeRoles("admin"), deleteProduct);
router.put("/admin/product/:id/discount", updateProductDiscount);
router.route("/product/:id").get(getProductDetails);



module.exports = router  