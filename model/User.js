// backend/model/User.js

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    // --- 1. Personal Information ---
    name: {
      // <-- YEH NAYA FIELD REGISTRATION KE LIYE ZAROORI HAI
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },

    // --- 2. KYC Information (Ab Organised Hai) ---
    kycStatus: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"], // "Failed" ko "Rejected" se badal diya hai
      default: "Pending",
    },
    panNumber: {
      type: String,
      trim: true,
      default: null,
    },
    kycDocuments: {
      // <-- Saare document URLs ek object ke andar
      aadhaarFrontUrl: { type: String },
      aadhaarBackUrl: { type: String },
      panUrl: { type: String }, // PAN card ka ek hi side hota hai, isliye ek hi URL kaafi hai
    },
  },
  {
    timestamps: true, // Yeh record karega ki user kab bana aur kab update hua
  }
);

const User = mongoose.model("User", userSchema, "users");

module.exports = User;
