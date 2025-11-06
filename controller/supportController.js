const SupportRequest = require("../model/supportRequestModel");

exports.createSupportRequest = async (req, res) => {
  const { issue, detail, language, email, message } = req.body;
  const supportRequest = await SupportRequest.create({ issue, detail, language, email, message });
  res.status(201).json({ success: true, supportRequest });
};

exports.getAllSupportRequests = async (req, res) => {
  const requests = await SupportRequest.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, requests });
};