const User = require("../models/User")
const Joi = require("joi")
const { deleteFromCloudinary } = require("../config/cloudinary")

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

    // Get current user to access old images
    const currentUser = await User.findById(req.user.id)
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" })
    }

    // Prepare update object
    const updateData = {
      phoneNumber,
      businessEmail,
      businessNumber,
      businessDescription,
      location,
      businessName,
      isProfileComplete: true,
    }

    // Handle avatar upload
    if (req.files && req.files.avatar) {
      // Delete old avatar if exists
      if (currentUser.avatar.public_id) {
        await deleteFromCloudinary(currentUser.avatar.public_id)
      }

      updateData.avatar = {
        url: req.files.avatar[0].path,
        public_id: req.files.avatar[0].filename,
      }
    }

    // Handle cover image upload
    if (req.files && req.files.coverImage) {
      // Delete old cover image if exists
      if (currentUser.coverImage.public_id) {
        await deleteFromCloudinary(currentUser.coverImage.public_id)
      }

      updateData.coverImage = {
        url: req.files.coverImage[0].path,
        public_id: req.files.coverImage[0].filename,
      }
    }

    console.log("Update data:", updateData)

    // Update user
    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
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
