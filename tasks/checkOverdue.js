// backend/tasks/checkOverdue.js

const LoanApplication = require("../model/LoanApplication");
const sendEmail = require("../utils/sendEmail"); // NAYI LINE: Email service ko import karein

const LATE_FEE = 500;

const checkOverdueEMIs = async () => {
  console.log("Running daily check for overdue EMIs...");
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueApplications = await LoanApplication.find({
      "repaymentSchedule.dueDate": { $lt: today },
      "repaymentSchedule.status": "Pending",
    });

    for (const app of overdueApplications) {
      let needsSave = false;
      for (const emi of app.repaymentSchedule) {
        if (emi.status === "Pending" && emi.dueDate < today) {
          emi.status = "Overdue";
          emi.lateFee = LATE_FEE;
          needsSave = true;
          console.log(`EMI for application ${app._id} is now Overdue.`);

          // --- NAYA EMAIL LOGIC SHURU ---
          const subject = `EMI Payment Overdue for your Loan with ShikshaFinance`;
          const text = `Dear ${
            app.fullName
          },\n\nThis is a reminder that your EMI payment of ₹${
            emi.emiAmount
          } for your loan was due on ${emi.dueDate.toLocaleDateString(
            "en-IN"
          )}.\n\nIt is now overdue. A late fee of ₹${LATE_FEE} has been applied.\n\nPlease log in to your dashboard to complete the payment at the earliest.\n\nRegards,\nTeam ShikshaFinance`;

          await sendEmail(app.email, subject, text);
          // --- NAYA EMAIL LOGIC KHATAM ---
        }
      }
      if (needsSave) {
        await app.save();
      }
    }
    console.log("Finished checking for overdue EMIs.");
  } catch (error) {
    console.error("Error checking for overdue EMIs:", error);
  }
};

module.exports = checkOverdueEMIs;
