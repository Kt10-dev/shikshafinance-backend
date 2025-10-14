// backend/model/LoanApplication.js

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const emiSchema = new Schema({
  emiAmount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, required: true, default: "Pending" },
});

const loanApplicationSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Personal Details
    studentId: { type: String, trim: true },
    fullName: { type: String, required: true, trim: true },
    gender: { type: String, required: true },
    dob: { type: Date, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: { type: String, required: true, trim: true },
    aadhaar: { type: String, required: true, trim: true },
    fatherName: { type: String, required: true, trim: true },
    motherName: { type: String, required: true, trim: true },

    // Address Details
    address: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    nationality: { type: String, required: true, trim: true },

    // Academic Details
    personType: { type: String, required: true },
    courseName: { type: String, required: true, trim: true },
    collegeName: { type: String, required: true, trim: true },
    courseDuration: { type: String, required: true, trim: true },
    currentYear: { type: String, required: true, trim: true },
    previousMarks: { type: String, required: true, trim: true },

    // Loan Details
    loanType: { type: String, required: true },
    loanAmount: { type: Number, required: true },
    incomeDetails: { type: String, required: true, trim: true },

    // Co-Applicant Details
    coApplicantName: { type: String, trim: true },
    coApplicantRelation: { type: String, trim: true },
    coApplicantPhone: { type: String, trim: true },
    coApplicantIncome: { type: String, trim: true },

    // Other Fields
    documentUrl: { type: String },
    status: { type: String, required: true, default: "Pending Fee" },
    registrationFeeStatus: {
      // <-- YEH NAYA FIELD ADD KARO
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
    bankDetails: {
      accountHolderName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      ifscCode: { type: String, trim: true },
      bankName: { type: String, trim: true },
    },
    loanTenure: { type: Number },
    interestRate: { type: Number },
    repaymentSchedule: [emiSchema],
  },

  { timestamps: true }
);

const LoanApplication = mongoose.model(
  "LoanApplication",
  loanApplicationSchema,
  "loanapplications"
);
module.exports = LoanApplication;
