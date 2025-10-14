const nodemailer = require("nodemailer");

// 1. Apna Email Transporter Set karo
// Yeh batata hai ki email kahan se bhejna hai (e.g., Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Aapka email .env file se aayega
    pass: process.env.EMAIL_PASS, // Aapka App Password .env file se aayega
  },
});

const sendEmiReminderEmail = (userEmail, userName, emiAmount, dueDate) => {
  const subject = "🔔 Gentle Reminder: Your EMI Payment is Due Soon";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Hi ${userName},</h2>
      <p>This is a friendly reminder that your upcoming EMI payment of <b>₹${emiAmount.toLocaleString(
        "en-IN"
      )}</b> is due on <b>${new Date(dueDate).toLocaleDateString(
    "en-IN"
  )}</b>.</p>
      <p>Please log in to your dashboard to make the payment on time to avoid any late fees.</p>
      <p>Thank you for your timely payments.</p>
      <p><b>Regards,<br/>Team ShikshaFinance</b></p>
    </div>
  `;
  sendEmail(userEmail, subject, html);
};

// 2. Email Bhejne ka Main Function
const sendEmail = (to, subject, html) => {
  const mailOptions = {
    from: `"ShikshaFinance" <${process.env.EMAIL_USER}>`, // Aapke brand ka naam
    to: to,
    subject: subject,
    html: html,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("❌ Error sending email:", error);
    } else {
      console.log("✅ Email sent successfully:", info.response);
    }
  });
};

// 3. Loan Approval Email ka Template
const sendApprovalEmail = (userEmail, userName, loanAmount) => {
  const subject = "🎉 Congratulations! Your Loan has been Approved";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Hi ${userName},</h2>
      <p>We are happy to inform you that your loan application for <b>₹${loanAmount.toLocaleString(
        "en-IN"
      )}</b> has been approved!</p>
      <p>The repayment schedule is now available on your dashboard. The loan amount will be disbursed to your registered bank account within 2-3 working days.</p>
      <p>Thank you for choosing ShikshaFinance.</p>
      <p><b>Regards,<br/>Team ShikshaFinance</b></p>
    </div>
  `;
  sendEmail(userEmail, subject, html);
};

// 4. Loan Rejection Email ka Template
const sendRejectionEmail = (userEmail, userName) => {
  const subject = "Update on Your Loan Application with ShikshaFinance";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Hi ${userName},</h2>
      <p>Thank you for your interest in a loan from ShikshaFinance. After careful consideration, we regret to inform you that we are unable to approve your application at this time as it does not meet our current policy guidelines.</p>
      <p>We encourage you to re-apply in the future if your circumstances change.</p>
      <p>We wish you the best.</p>
      <p><b>Regards,<br/>Team ShikshaFinance</b></p>
    </div>
  `;
  sendEmail(userEmail, subject, html);
};

// Dono functions ko export karo taaki hum doosri files mein use kar sakein
module.exports = {
  sendApprovalEmail,
  sendRejectionEmail,
  sendEmiReminderEmail,
};
