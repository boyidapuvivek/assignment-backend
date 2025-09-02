const User = require("../models/User")
const Joi = require("joi")

// Validation schema for profile update
const updateProfileSchema = Joi.object({
  phoneNumber: Joi.string().allow(""),
  businessEmail: Joi.string().email().allow(""),
  businessNumber: Joi.string().allow(""),
  businessDescription: Joi.string().max(200).allow(""),
  location: Joi.string().allow(""),
  businessName: Joi.string().allow(""),
})

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password")
    res.json(user)
  } catch (error) {
    console.error("Get profile error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Update user profile (edit my card)
const updateProfile = async (req, res) => {
  try {
    // Validate input
    const { error } = updateProfileSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const {
      phoneNumber,
      businessEmail,
      businessNumber,
      businessDescription,
      location,
      businessName,
    } = req.body

    console.log(
      phoneNumber,
      businessEmail,
      businessNumber,
      businessDescription,
      location,
      businessName
    )

    // Update user
    const user = await User.findByIdAndUpdate(req.user.id, {
      phoneNumber,
      businessEmail,
      businessNumber,
      businessDescription,
      location,
      businessName,
      isProfileComplete: true,
    }).select("-password")

    res.json({
      message: "Profile updated successfully",
      user,
    })
  } catch (error) {
    console.error("Update profile error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

module.exports = {
  getProfile,
  updateProfile,
}
