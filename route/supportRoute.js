const express = require("express");
const { createSupportRequest, getAllSupportRequests } = require("../controller/supportController");
const { isAuthentictedUser, authorizeRoles } = require("../middleWare/auth");
const router = express.Router();

router.post("/support", createSupportRequest);
router.get("/admin/support", isAuthentictedUser, authorizeRoles("admin"), getAllSupportRequests);

module.exports = router;