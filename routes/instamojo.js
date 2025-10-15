// backend/routes/instamojo.js

const router = require("express").Router();
const Insta = require("instamojo-nodejs");
const auth = require("../middleware/auth");
const LoanApplication = require("../model/LoanApplication");

// Configure Instamojo with your API keys
Insta.setKeys(process.env.INSTAMOJO_API_KEY, process.env.INSTAMOJO_SALT);
Insta.isSandboxMode(true); // IMPORTANT: Use true for testing, false for real payments

// ROUTE 1: Create a payment link for the registration fee
router.route("/create-payment-link").post(auth, async (req, res) => {
  try {
    const { amount, purpose, buyer_name, email, applicationId } = req.body;

    // Find the user to get their phone number
    const user = await require("../model/User").findById(req.user);

    const paymentData = new Insta.PaymentData();
    paymentData.purpose = purpose;
    paymentData.amount = amount;
    paymentData.buyer_name = buyer_name;
    paymentData.email = email;
    paymentData.phone = user.phone || "9999999999"; // Use a placeholder if phone not available
    paymentData.send_email = true;
    paymentData.send_sms = false;
    paymentData.allow_repeated_payments = false;

    // This is the URL where Instamojo will send the user back after payment
    paymentData.redirect_url = `https://shikshafinance-frontend.vercel.app/payment-status?app_id=${applicationId}`;

    Insta.createPayment(paymentData, (error, response) => {
      if (error) {
        console.error("Instamojo Error:", error);
        return res
          .status(500)
          .json({ success: false, message: "Could not create payment link." });
      } else {
        const responseData = JSON.parse(response);
        return res.json({
          success: true,
          payment_url: responseData.payment_request.longurl,
        });
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ROUTE 2: Verify the payment after redirect (webhook would be better for production)
// For now, this route isn't strictly needed as Instamojo handles verification on redirect.
// We will update the application status on the payment-status page in the frontend.

module.exports = router;
