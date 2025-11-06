const AbusiveReport = require("../model/abusiveReportModel");

exports.createAbusiveReport = async (req, res) => {
  const { reviewId, productId, reason, comment } = req.body;
  const reportedBy = req.user._id;
  const report = await AbusiveReport.create({ reviewId, productId, reason, comment, reportedBy });
  res.status(201).json({ success: true, report });
};

exports.getAllAbusiveReports = async (req, res) => {
  const reports = await AbusiveReport.find().populate("reportedBy", "name email").sort({ createdAt: -1 });
  res.status(200).json({ success: true, reports });
};
exports.getAbusiveReportById = async (req, res) => {
  const report = await AbusiveReport.findById(req.params.id).populate("reportedBy", "name email");
  if (!report) {
    return res.status(404).json({ success: false, message: "Report not found" });
  }
  res.status(200).json({ success: true, report });
};


