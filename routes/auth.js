// backend/routes/auth.js

const router = require("express").Router();

// Hum abhi ke liye admin credentials yahaan hardcode kar rahe hain
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "password123";

router.route("/login").post((req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // Agar username aur password match karte hain
    res.json({ success: true, message: "Login successful!" });
  } else {
    // Agar match nahi karte hain
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

module.exports = router;
