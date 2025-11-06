const ProductModel = require("../model/ProductModel");
const ErrorHandler = require("../utils/errorHandler");
const asyncWrapper = require("../middleWare/asyncWrapper");
const ApiFeatures = require("../utils/apiFeatures");
const cloudinary = require("cloudinary");
const Product = require("../models/productModel");

// >>>>>>>>>>>>>>>>>>>>> createProduct Admin route  >>>>>>>>>>>>>>>>>>>>>>>>
exports.createProduct = asyncWrapper(async (req, res) => {
  let images = []; 

  if (req.body.images) {
    if (typeof req.body.images === "string") {
      images.push(req.body.images);
    } else {
      images = req.body.images;
    }

    const imagesLinks = [];

    // Split images into chunks due to cloudinary upload limits only 3 images can be uploaded at a time so we are splitting into chunks and uploading them separately eg: 9 images will be split into 3 chunks and uploaded separately
    const chunkSize = 3;
    const imageChunks = [];
    while (images.length > 0) {
      imageChunks.push(images.splice(0, chunkSize));
    }


    // Upload images in separate requests. for loop will run 3 times if there are 9 images to upload each time uploading 3 images at a time
    for (let chunk of imageChunks) {
      const uploadPromises = chunk.map((img) =>
        cloudinary.v2.uploader.upload(img, {
          folder: "Products",
        })
      );

      
      const results = await Promise.all(uploadPromises); // wait for all the promises to resolve and store the results in results array eg: [{}, {}, {}] 3 images uploaded successfully and their details are stored in results array

      for (let result of results) { 
        imagesLinks.push({
          product_id: result.public_id,
          url: result.secure_url,
        });
      }
    }

    req.body.user = req.user.id;
    req.body.images = imagesLinks;
  }

  // { received form data / req.body processing }
  const discount = req.body.discountPercentage !== undefined ? Number(req.body.discountPercentage) : 0;
  if (isNaN(discount) || discount < 0 || discount > 100) {
    return res.status(400).json({ success: false, message: "discountPercentage must be a number between 0 and 100" });
  }

  const data = await ProductModel.create(req.body);

  // ensure discountPercentage persisted
  data.discountPercentage = discount; // or include in the create payload
  await data.save();

  res.status(200).json({ success: true, data: data });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> get all product >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
exports.getAllProducts = asyncWrapper(async (req, res) => {
  const resultPerPage = 6; // Number of products visible per page
  const productsCount = await ProductModel.countDocuments(); // Get total number of products

  // Create an instance of the ApiFeatures class, passing the ProductModel.find() query and req.query (queryString)
  const apiFeature = new ApiFeatures(ProductModel.find(), req.query)
    .search() // Apply search filter based on the query parameters
    .filter(); // Apply additional filters based on the query parameters

  let products = await apiFeature.query; // Fetch the products based on the applied filters and search

  let filteredProductCount = products.length; // Number of products after filtering (for pagination)

  apiFeature.Pagination(resultPerPage); // Apply pagination to the products

  // Mongoose no longer allows executing the same query object twice, so use .clone() to retrieve the products again
  products = await apiFeature.query.clone(); // Retrieve the paginated products

  res.status(201).json({
    success: true,
    products: products,
    productsCount: productsCount,
    resultPerPage: resultPerPage,
    filteredProductCount: filteredProductCount,
  });
});




// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> get all product admin route>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

exports.getAllProductsAdmin = asyncWrapper(async (req, res) => {
  const products = await ProductModel.find();

  res.status(201).json({  
    success: true,
    products,
  });
});

  


//>>>>>>>>>>>>>>>>>> Update Admin Route >>>>>>>>>>>>>>>>>>>>>>>
exports.updateProduct = asyncWrapper(async (req, res, next) => {
  let product = await ProductModel.findById(req.params.id);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // Only process images if provided in the request
  let images = [];
  if (req.body.images) {
    if (typeof req.body.images === "string") {
      images.push(req.body.images);
    } else if (Array.isArray(req.body.images)) {
      images = req.body.images;
    }

    if (images.length > 0) {
      // Deleting Images From Cloudinary (only if existing images array present)
      if (Array.isArray(product.images) && product.images.length > 0) {
        for (let i = 0; i < product.images.length; i++) {
          if (product.images[i] && product.images[i].product_id) {
            await cloudinary.v2.uploader.destroy(product.images[i].product_id);
          }
        }
      }

      const imagesLinks = [];
      for (let img of images) {
        const result = await cloudinary.v2.uploader.upload(img, {
          folder: "Products",
        });

        imagesLinks.push({
          product_id: result.public_id,
          url: result.secure_url,
        });
      }

      req.body.images = imagesLinks;
    }
  }

  // ensure discountPercentage updated
  if (req.body.discountPercentage !== undefined) {
    const discountVal = Number(req.body.discountPercentage);
    if (isNaN(discountVal) || discountVal < 0 || discountVal > 100) {
      return res.status(400).json({ success: false, message: "discountPercentage must be a number between 0 and 100" });
    }
    product.discountPercentage = discountVal;
  }

  product = await ProductModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(201).json({
    success: true,
    product: product,
  });
});


//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>  delete product --admin  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
exports.deleteProduct = asyncWrapper(async (req, res, next) => {
  let product = await ProductModel.findById(req.params.id);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // Deleting Images From Cloudinary
  for (let i = 0; i < product.images.length; i++) {
    await cloudinary.v2.uploader.destroy(product.images[i].product_id);
  }

  await product.remove();

  res.status(201).json({
    success: true,
    message: "Product delete successfully",
  });
});

//>>>>>>>>>>>>>>>>>>>>>>> Detils of product >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
exports.getProductDetails = asyncWrapper(async (req, res, next) => {
  const id = req.params.id;
  const Product = await ProductModel.findById(id);
  if (!Product) {
    return next(new ErrorHandler("Product not found", 404));
  }
  res.status(201).json({
    succes: true,
    Product: Product,
  });
});

// PUT /api/v1/admin/product/:id/discount
exports.updateProductDiscount = asyncWrapper(async (req, res, next) => {
  const productId = req.params.id;
  const { discountPercentage } = req.body;

  if (discountPercentage == null) {
    return res.status(400).json({ success: false, message: "discountPercentage is required" });
  }
  const num = Number(discountPercentage);
  if (Number.isNaN(num) || num < 0 || num > 100) {
    return res.status(400).json({ success: false, message: "discountPercentage must be a number between 0 and 100" });
  }

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });

  product.discountPercentage = num;
  await product.save();

  // Return updated product (frontend will receive discountPercentage)
  res.status(200).json({ success: true, product });
});


