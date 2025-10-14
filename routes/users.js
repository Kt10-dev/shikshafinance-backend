// backend/routes/users.js

const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
let User = require("../model/User");

// ROUTE 1: User Registration (UPDATED)
router.route("/register").post(async (req, res) => {
  try {
    // 1. Ab hum 'name' bhi le rahe hain frontend se
    const { name, email, password } = req.body;

    // Validation: Check if all fields are present
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Please enter all required fields." });
    }

    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "An account with this email already exists." });
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    // 2. Naye user ko save karte waqt 'name' bhi daalo
    const newUser = new User({
      name, // <-- YEH ZAROORI HAI
      email,
      password: passwordHash,
    });
    const savedUser = await newUser.save();
    res.json({ message: "User registered successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ROUTE 2: User Login (Minor Improvement)
router.route("/login").post(async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    // Login ke response mein naam bhi bhej do, taaki frontend par "Welcome, [Name]" dikha sakein
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name, // <-- Yeh add kiya hai
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
