// backend/routes/payment.js

const router = require("express").Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const auth = require("../middleware/auth");
const LoanApplication = require("../model/LoanApplication");

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ROUTE 0: Send Razorpay Key ID to frontend
router.route("/get-key").get((req, res) => {
  res.json({ key: process.env.RAZORPAY_KEY_ID });
});

// ROUTE 1: Create a payment order
router.route("/create-order").post(auth, async (req, res) => {
  const { amount, emiId } = req.body;

  const options = {
    amount: Math.round(amount * 100), // Ensure amount is integer
    currency: "INR",
    receipt: `emi_${emiId}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res
      .status(500)
      .json({ success: false, message: "Could not create payment order." });
  }
});

// ROUTE 2: Verify the payment
router.route("/verify-payment").post(auth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      loanId,
      emiId,
    } = req.body;

    // Defensive check for missing payment details
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Missing payment details." });
    }

    // 1. Create the signature string
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    // 2. Generate the expected signature using your secret key
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    // 3. Compare the signatures
    if (expectedSignature === razorpay_signature) {
      // Payment is authentic, now update the database
      const application = await LoanApplication.findById(loanId);
      if (!application) {
        return res
          .status(404)
          .json({ success: false, message: "Loan application not found." });
      }

      // Defensive null checks for EMI
      const emiToUpdate = Array.isArray(application.repaymentSchedule)
        ? application.repaymentSchedule
            .filter((emi) => emi && emi._id != null)
            .find((emi) => emi._id.toString() === emiId)
        : null;

      if (emiToUpdate) {
        emiToUpdate.status = "Paid";
        await application.save();
        console.log(`SUCCESS: EMI status updated to Paid for emiId: ${emiId}`);

        return res.json({
          success: true,
          message: "Payment verified and status updated.",
        });
      } else {
        console.error(
          `ERROR: Could not find EMI with id: ${emiId} in application: ${loanId}`
        );
        return res.status(404).json({
          success: false,
          message: `EMI not found in loan application for emiId: ${emiId}`,
        });
      }
    } else {
      // Payment is not authentic
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed." });
    }
  } catch (error) {
    console.error("Error during payment verification:", error);
    res.status(500).json({
      success: false,
      message: "Server error during verification.",
      error: error.message, // for debugging
    });
  }
});

// routes/payment.js

// ... aapka baaki ka code ...

// ROUTE 3: Create a REGISTRATION FEE order
router.route("/create-registration-order").post(auth, async (req, res) => {
  const { amount, applicationId } = req.body; // Yahan applicationId aayegi

  const options = {
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt: `reg_fee_${applicationId}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Could not create payment order." });
  }
});

// ROUTE 4: Verify the REGISTRATION FEE payment
router.route("/verify-registration-payment").post(auth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      applicationId,
    } = req.body;

    // STEP 1: Create the signature (Yeh hissa missing tha)
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    // STEP 2: Compare signatures
    if (expectedSignature === razorpay_signature) {
      // Payment is authentic, now update the database
      console.log(
        "SUCCESS: Payment signature verified for App ID:",
        applicationId
      );

      const application = await LoanApplication.findById(applicationId);

      if (application) {
        // STEP 3: Update status and save
        application.registrationFeeStatus = "Paid";
        application.status = "Pending"; // Ab yeh admin review ke liye taiyaar hai
        await application.save();

        console.log("SUCCESS: Application status updated to 'Pending' in DB.");
        return res.json({
          success: true,
          message: "Fee paid! Your application is now under review.",
        });
      } else {
        // Handle case where application is not found
        console.error("ERROR: Application not found for ID:", applicationId);
        return res
          .status(404)
          .json({ success: false, message: "Application not found." });
      }
    } else {
      // Handle signature mismatch
      console.error(
        "ERROR: Payment verification failed for App ID:",
        applicationId
      );
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed." });
    }
  } catch (error) {
    // Handle any server errors
    console.error("FATAL ERROR in /verify-registration-payment:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during verification." });
  }
});

module.exports = router;
