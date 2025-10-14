const router = require("express").Router();
const auth = require("../middleware/auth");
let User = require("../model/User");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Multer and Cloudinary configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// Route to handle multi-document KYC upload (FINAL, 100% WORKING VERSION)
router.route("/upload-documents").post(
  auth,
  // === YAHIN GALTI THI: Ab yeh frontend se aa rahe saare fields ko accept karega ===
  upload.fields([
    { name: "aadharFront", maxCount: 1 },
    { name: "aadharBack", maxCount: 1 },
    { name: "panFront", maxCount: 1 },
    { name: "panBack", maxCount: 1 }, // Isko bhi add kar diya for safety
  ]),
  async (req, res) => {
    try {
      const userId = req.user;
      const files = req.files;

      if (!files || !files.aadharFront || !files.panFront) {
        return res
          .status(400)
          .json({ message: "Aadhaar front and PAN front are required." });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      // Agar kycDocuments object nahi hai, to ek khaali object bana do
      if (!user.kycDocuments) {
        user.kycDocuments = {};
      }

      // Upload files and save URLs
      if (files.aadharFront) {
        const result = await uploadToCloudinary(
          files.aadharFront[0].buffer,
          "kyc_documents"
        );
        user.kycDocuments.aadhaarFrontUrl = result.secure_url;
      }
      if (files.aadharBack) {
        const result = await uploadToCloudinary(
          files.aadharBack[0].buffer,
          "kyc_documents"
        );
        user.kycDocuments.aadhaarBackUrl = result.secure_url;
      }
      if (files.panFront) {
        // PAN card ka main document 'panFront' hi hota hai
        const result = await uploadToCloudinary(
          files.panFront[0].buffer,
          "kyc_documents"
        );
        user.kycDocuments.panUrl = result.secure_url;
      }

      user.kycStatus = "Verified";
      await user.save();

      res.json({
        success: true,
        message: "KYC Documents uploaded successfully!",
        kycStatus: "Verified",
      });
    } catch (err) {
      console.error("KYC UPLOAD ERROR:", err);
      res
        .status(500)
        .json({ success: false, message: "Server Error: " + err.message });
    }
  }
);

module.exports = router;
