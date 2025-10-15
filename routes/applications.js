const router = require("express").Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
let LoanApplication = require("../model/LoanApplication");
const auth = require("../middleware/auth");
const User = require("../model/User");
const PDFDocument = require("pdfkit");
const {
  sendApprovalEmail,
  sendRejectionEmail,
  sendEmiReminderEmail,
} = require("../services/emailService");

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "loan_documents" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// I am only showing the updated download route for clarity. The other routes should remain.

// ====================================================================
// === YEH RAHA AAPKA FINAL, "CRASH-PROOF" PDF DOWNLOAD ROUTE ===
// ====================================================================
router.route("/:id/download-statement").get(async (req, res) => {
  try {
    const application = await LoanApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ msg: "Application not found." });
    }
    if (
      application.status !== "Approved" ||
      !application.repaymentSchedule ||
      application.repaymentSchedule.length === 0
    ) {
      return res
        .status(400)
        .send(
          "Statement can only be generated for approved loans with a repayment schedule."
        );
    }

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Statement_${application._id}.pdf"`
    );

    doc.pipe(res);

    // --- PDF Content ---
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("ShikshaFinance - Loan Statement", { align: "center" });
    doc.moveDown(2);

    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Applicant Name: ${application.fullName || "N/A"}`);
    doc.text(`Email: ${application.email || "N/A"}`);
    doc.moveDown();
    doc.text(
      `Loan Amount: Rs. ${(application.loanAmount || 0).toLocaleString(
        "en-IN"
      )}`
    );
    doc.text(`Interest Rate: ${application.interestRate || 0}%`);
    doc.text(`Tenure: ${application.loanTenure || 0} months`);
    doc.moveDown(2);

    doc.fontSize(16).font("Helvetica-Bold").text("Repayment Schedule");
    doc.moveDown();

    // === YAHIN PAR MAIN CHANGE HUA HAI (Table banane ka tareeka) ===
    const tableTop = doc.y;
    const itemX = 50;
    const dateX = 150;
    const amountX = 300;
    const statusX = 450;

    // Table Header
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("EMI #", itemX, tableTop);
    doc.text("Due Date", dateX, tableTop);
    doc.text("Amount", amountX, tableTop, { width: 100, align: "right" });
    doc.text("Status", statusX, tableTop);
    doc.moveDown();
    doc
      .strokeColor("#aaaaaa")
      .lineWidth(1)
      .moveTo(itemX, doc.y)
      .lineTo(550, doc.y)
      .stroke();
    doc.font("Helvetica");

    // Table Rows
    application.repaymentSchedule.forEach((emi, index) => {
      doc.moveDown(0.5);
      const y = doc.y;

      // Page break check (agar zaroorat pade to naya page banao)
      if (y > 700) {
        doc.addPage();
        // Naye page par header dobara banao (optional)
      }

      doc.fontSize(10).text(index + 1, itemX, y);
      doc.text(new Date(emi.dueDate).toLocaleDateString("en-IN"), dateX, y);
      doc.text(
        `Rs. ${(emi.emiAmount || 0).toLocaleString("en-IN")}`,
        amountX,
        y,
        { width: 100, align: "right" }
      );
      doc.text(emi.status || "N/A", statusX, y);
    });
    // --- PDF Content End ---

    doc.end();
  } catch (err) {
    console.error("FATAL ERROR IN PDF GENERATION:", err);
    res.status(500).send("Server Error: Could not generate PDF.");
  }
});

// ROUTE 1: Apply for a new loan
router
  .route("/apply")
  .post(auth, upload.single("document"), async (req, res) => {
    try {
      let documentUrl = "";
      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer);
        documentUrl = result.secure_url;
      }
      const allFields = req.body;
      const newApplication = new LoanApplication({
        ...allFields,
        bankDetails: {
          accountHolderName: allFields.accountHolderName,
          accountNumber: allFields.accountNumber,
          ifscCode: allFields.ifscCode,
          bankName: allFields.bankName,
        },
        userId: req.user,
        documentUrl: documentUrl,
      });
      const savedApplication = await newApplication.save();
      req.io.emit("new_application_added", savedApplication);
      res.json({
        message: "Application submitted! Please pay the registration fee.",
        applicationId: savedApplication._id,
      });
    } catch (err) {
      console.error("Application submission error:", err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  });

// ROUTE 2: Get all applications for ADMIN (with populated user data)
router.route("/").get(async (req, res) => {
  try {
    const applications = await LoanApplication.find({})
      .sort({ createdAt: -1 })
      .populate({
        path: "userId",
        select: "name email kycDocuments",
      });
    res.json(applications);
  } catch (err) {
    console.error("Error fetching applications for admin:", err);
    res.status(500).json({ error: "Error fetching applications" });
  }
});

// ROUTE 3: Update application status
router.route("/update-status/:id").patch(async (req, res) => {
  try {
    const { status, loanTenure, interestRate } = req.body;
    const application = await LoanApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    application.status = status;
    if (loanTenure) application.loanTenure = loanTenure;
    if (interestRate) application.interestRate = interestRate;
    if (
      status === "Approved" &&
      application.loanTenure > 0 &&
      application.interestRate > 0
    ) {
      const p = application.loanAmount;
      const r = application.interestRate / 12 / 100;
      const n = application.loanTenure;
      const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      const schedule = [];
      let today = new Date();
      for (let i = 1; i <= n; i++) {
        schedule.push({
          emiAmount: parseFloat(emi.toFixed(2)),
          dueDate: new Date(today.getFullYear(), today.getMonth() + i, 5),
          status: "Pending",
        });
      }
      application.repaymentSchedule = schedule;
    }
    await application.save();
    req.io.emit("status_updated", {
      id: application._id,
      status: application.status,
    });
    const user = await User.findById(application.userId);
    if (user) {
      const userName = user.name || application.fullName;
      if (status === "Approved") {
        sendApprovalEmail(user.email, userName, application.loanAmount);
      } else if (status === "Rejected") {
        sendRejectionEmail(user.email, userName);
      }
    }
    res.json({ message: "Application updated successfully!" });
  } catch (err) {
    console.error("Error updating application:", err);
    res.status(500).json({ error: "Error: " + err.message });
  }
});

// ROUTE 4: Get single application for USER DASHBOARD
router.route("/my-application").get(auth, async (req, res) => {
  try {
    const user = await User.findById(req.user);
    if (!user) {
      return res.status(404).json({ msg: "User not found." });
    }
    const application = await LoanApplication.findOne({ userId: req.user });
    res.json({ application: application, kycStatus: user.kycStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ROUTE 5: Manual EMI Reminder
router.route("/:loanId/send-reminder/:emiId").post(async (req, res) => {
  try {
    const { loanId, emiId } = req.params;
    const loan = await LoanApplication.findById(loanId);
    if (!loan) return res.status(404).json({ msg: "Loan not found." });
    const user = await User.findById(loan.userId);
    if (!user) return res.status(404).json({ msg: "User not found." });
    const emi = loan.repaymentSchedule.id(emiId);
    if (!emi) return res.status(404).json({ msg: "EMI not found." });
    const userName = user.name || loan.fullName;
    sendEmiReminderEmail(user.email, userName, emi.emiAmount, emi.dueDate);
    res.json({ success: true, message: `Reminder sent to ${user.email}` });
  } catch (err) {
    console.error("Error in /send-reminder route:", err);
    res.status(500).json({ error: "Server error." });
  }
});

router
  .route("/my-application/download-statement")
  .get(auth, async (req, res) => {
    try {
      const application = await LoanApplication.findOne({ userId: req.user });

      if (!application) {
        return res.status(404).json({ msg: "Application not found." });
      }

      // 1. SABSE ZAROORI CHECK: Agar loan approved nahi hai, to PDF nahi banega.
      if (application.status !== "Approved") {
        return res
          .status(400)
          .send("Statement can only be generated for an approved loan.");
      }

      // 2. SAFETY CHECK: Agar EMI schedule nahi hai, to error do.
      if (
        !application.repaymentSchedule ||
        application.repaymentSchedule.length === 0
      ) {
        return res
          .status(400)
          .send("Repayment schedule not found for this loan.");
      }

      const doc = new PDFDocument({ margin: 50 });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="LoanStatement_${application._id}.pdf"`
      );

      doc.pipe(res);

      // --- PDF Content ---
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("ShikshaFinance - Loan Statement", { align: "center" });
      doc.moveDown(2);

      doc
        .fontSize(12)
        .font("Helvetica")
        .text(`Applicant Name: ${application.fullName || "N/A"}`);
      doc.text(`Email: ${application.email || "N/A"}`);
      doc.moveDown();
      doc.text(
        `Loan Amount: Rs. ${(application.loanAmount || 0).toLocaleString(
          "en-IN"
        )}`
      );
      doc.text(`Interest Rate: ${application.interestRate || 0}%`);
      doc.text(`Tenure: ${application.loanTenure || 0} months`);
      doc.moveDown(2);

      doc.fontSize(16).font("Helvetica-Bold").text("Repayment Schedule");
      doc
        .strokeColor("#aaaaaa")
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke();
      doc.moveDown();

      const tableTop = doc.y;
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("EMI #", 50, tableTop);
      doc.text("Due Date", 150, tableTop);
      doc.text("Amount", 300, tableTop, { width: 100, align: "right" });
      doc.text("Status", 450, tableTop);
      doc.font("Helvetica");

      application.repaymentSchedule.forEach((emi, index) => {
        doc.moveDown(0.5);
        const y = doc.y;
        if (y > 700) {
          doc.addPage();
        } // Automatic page break
        doc.fontSize(10).text(index + 1, 50, y);
        doc.text(new Date(emi.dueDate).toLocaleDateString("en-IN"), 150, y);
        doc.text(
          `Rs. ${(emi.emiAmount || 0).toLocaleString("en-IN")}`,
          300,
          y,
          { width: 100, align: "right" }
        );
        doc.text(emi.status || "N/A", 450, y);
      });
      // --- PDF Content End ---

      doc.end();
    } catch (err) {
      console.error(
        "!!!!!!!! FATAL ERROR IN USER PDF GENERATION !!!!!!!!",
        err
      );
      res.status(500).send("Server Error: Could not generate PDF.");
    }
  });

router.route("/update-fee-status/:id").patch(auth, async (req, res) => {
  try {
    const application = await LoanApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    application.registrationFeePaid = true;
    application.status = "Pending"; // Move to the next stage for admin review
    await application.save();

    res.json({ success: true, message: "Application status updated." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
