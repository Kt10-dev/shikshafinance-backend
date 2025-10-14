// backend/index.js

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = 5000;
const authRouter = require("./routes/auth");
const usersRouter = require("./routes/users");
const checkOverdueEMIs = require("./tasks/checkOverdue");
const kycRouter = require("./routes/kyc"); // NAYI LINE
const paymentRouter = require("./routes/payment");
const cron = require("node-cron");
const statsRouter = require("./routes/stats");
const { sendEmiReminderEmail } = require("./services/emailService");
const LoanApplication = require("./model/LoanApplication");
const http = require("http"); // 1. Naya import
const { Server } = require("socket.io"); // 2. Naya import

app.use(cors());
app.use(express.json());
app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/kyc", kycRouter); // NAYI LINE
app.use("/payment", paymentRouter); // NAYI LINE

const uri = process.env.MONGO_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const connection = mongoose.connection;
connection.once("open", () => {
  console.log("✅ MongoDB database connection established successfully!");
});

// --- YAHAN NAYA CODE ADD KAREIN ---
const applicationsRouter = require("./routes/applications"); // Apni route file ko import karein

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Aapke frontend ka address
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("✅ A user connected with socket ID:", socket.id);
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use("/applications", applicationsRouter); // Server ko batayein ki in routes ka istemaal karna hai
// --- NAYA CODE KHATAM ---
app.use("/stats", statsRouter); // <-- YEH NAYI LINE ADD KARO

app.get("/", (req, res) => {
  res.json({ message: "Welcome to ShikshaFinance Backend!" });
});
cron.schedule("0 1 * * *", () => {
  checkOverdueEMIs();
});

app.get("/run-overdue-check", (req, res) => {
  console.log("Manually triggering the overdue EMI check...");
  checkOverdueEMIs(); // Make sure checkOverdueEMIs is required at the top of the file
  res.send(
    "Overdue check function has been triggered. Check your backend terminal for logs."
  );
});

cron.schedule("0 9 * * *", async () => {
  console.log("⏰ Running daily job to send EMI reminders...");

  try {
    const today = new Date();
    const reminderDate = new Date();
    reminderDate.setDate(today.getDate() + 3); // Aaj se theek 3 din baad ki date

    // 1. Sirf 'Approved' status wali applications dhoondho
    const approvedLoans = await LoanApplication.find({ status: "Approved" });

    for (const loan of approvedLoans) {
      // 2. Har loan ke andar aisi EMI dhoondho jo 3 din baad due hai
      const emiToRemind = loan.repaymentSchedule.find((emi) => {
        const dueDate = new Date(emi.dueDate);
        return (
          emi.status === "Pending" &&
          dueDate.getDate() === reminderDate.getDate() &&
          dueDate.getMonth() === reminderDate.getMonth() &&
          dueDate.getFullYear() === reminderDate.getFullYear()
        );
      });

      if (emiToRemind) {
        // 3. Agar aisi EMI milti hai, to user ki email ID dhoondho
        const user = await User.findById(loan.userId);
        if (user) {
          // 4. User ko reminder email bhej do
          console.log(
            `✅ Sending reminder to ${user.email} for EMI due on ${new Date(
              emiToRemind.dueDate
            ).toLocaleDateString("en-IN")}`
          );
          sendEmiReminderEmail(
            user.email,
            user.name, // Aapke User model mein 'name' field honi chahiye
            emiToRemind.emiAmount,
            emiToRemind.dueDate
          );
        }
      }
    }
  } catch (err) {
    console.error("❌ Error in EMI reminder job:", err);
  }
});

server.listen(PORT, () => {
  console.log(`🎉 Server is running on port ${PORT}`);
});

// backend / index.js;
