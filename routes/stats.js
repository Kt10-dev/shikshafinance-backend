// routes/stats.js
const router = require("express").Router();
const LoanApplication = require("../model/LoanApplication");

router.get("/", async (req, res) => {
  try {
    // 1. Total Applications
    const totalApplications = await LoanApplication.countDocuments({});

    // 2. Applications by Status (Pending, Approved, Rejected)
    const applicationsByStatus = await LoanApplication.aggregate([
      {
        $group: {
          _id: "$status", // status field ke hisaab se group karo
          count: { $sum: 1 }, // har group mein kitne hain, gino
        },
      },
    ]);

    // 3. Total Loan Amount Disbursed (Sirf approved loans ka total)
    const totalDisbursed = await LoanApplication.aggregate([
      {
        $match: { status: "Approved" }, // Sirf 'Approved' applications ko filter karo
      },
      {
        $group: {
          _id: null, // Sabko ek hi group mein daalo
          total: { $sum: "$loanAmount" }, // loanAmount ko jod do
        },
      },
    ]);

    // Data ko frontend ke liye aasan format mein taiyaar karo
    const stats = {
      totalApplications: totalApplications,
      statusCounts: applicationsByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      totalDisbursed: totalDisbursed.length > 0 ? totalDisbursed[0].total : 0,
    };

    res.json(stats);
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
