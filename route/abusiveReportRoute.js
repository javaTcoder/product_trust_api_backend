const express = require("express");
const { createAbusiveReport, getAllAbusiveReports , getAbusiveReportById} = require("../controller/abusiveReportController");
const { isAuthentictedUser, authorizeRoles } = require("../middleWare/auth");
const router = express.Router();

router.post("/report-abuse", isAuthentictedUser, createAbusiveReport);
router.get("/admin/abusive-reports", isAuthentictedUser, authorizeRoles("admin"), getAllAbusiveReports);
router.get("/admin/abusive-reports/:id", isAuthentictedUser, authorizeRoles("admin"), getAbusiveReportById);

module.exports = router;