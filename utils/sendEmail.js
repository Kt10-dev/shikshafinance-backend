// backend/utils/sendEmail.js

const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER, // Gets email from .env file
        pass: process.env.EMAIL_PASS, // Gets password from .env file
      },
    });

    await transporter.sendMail({
      from: `"ShikshaFinance" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      text: text,
    });

    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
  }
};

module.exports = sendEmail;
