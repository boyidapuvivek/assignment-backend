// routes/userRoutes.js
const express = require("express")
const { getProfile, updateProfile } = require("../controllers/userController")
const { upload } = require("../config/cloudinary")
const auth = require("../middleware/auth")

const router = express.Router()

// GET /api/users/profile
router.get("/profile", auth, getProfile)

// PUT /api/users/profile
router.put(
  "/profile",
  auth,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  updateProfile
)

module.exports = router
