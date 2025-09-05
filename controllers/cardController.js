const User = require("../models/User")
const Joi = require("joi")
const { deleteFromCloudinary } = require("../config/cloudinary")
const crypto = require("crypto")

// Function to generate a random password
const generateRandomPassword = (length = 12) => {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let password = ""
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

// Validation schemas
const createCardSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).optional(),
  cardType: Joi.string().valid("team", "business").required(),
  phoneNumber: Joi.string().allow(""),
  businessEmail: Joi.string().email().allow(""),
  businessNumber: Joi.string().allow(""),
  businessDescription: Joi.string().max(200).allow(""),
  location: Joi.string().allow(""),
  businessName: Joi.string().allow(""),
  // New validation for added fields
  socialMediaLinks: Joi.object({
    facebook: Joi.string().allow(""),
    twitter: Joi.string().allow(""),
    linkedIn: Joi.string().allow(""),
    instagram: Joi.string().allow(""),
  }).optional(),
  services: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        price: Joi.number().min(0).required(),
      })
    )
    .optional(),
  products: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        price: Joi.number().min(0).required(),
      })
    )
    .optional(),
  gallery: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().required(),
        public_id: Joi.string().required(),
      })
    )
    .optional(),
})

const updateCardSchema = Joi.object({
  phoneNumber: Joi.string().allow(""),
  businessEmail: Joi.string().email().allow(""),
  businessNumber: Joi.string().allow(""),
  businessDescription: Joi.string().max(200).allow(""),
  location: Joi.string().allow(""),
  businessName: Joi.string().allow(""),
})

// Helper function to safely delete image from cloudinary
const safeDeleteImage = async (imageObj) => {
  if (imageObj && imageObj.public_id) {
    try {
      await deleteFromCloudinary(imageObj.public_id)
    } catch (error) {
      console.error("Error deleting image from cloudinary:", error)
    }
  }
}

// Get my card
const getMyCard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password")

    // Ensure image objects exist
    if (user) {
      user.avatar = user.avatar || null
      user.coverImage = user.coverImage || null
    }

    res.json(user)
  } catch (error) {
    console.error("Get my card error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get team cards
const getTeamCards = async (req, res) => {
  try {
    const teamCards = await User.find({
      ownerId: req.user.id,
      userType: "team",
    }).select("-password")

    // Ensure image objects exist for all cards
    const processedCards = teamCards.map((card) => ({
      ...card.toObject(),
      avatar: card.avatar || null,
      coverImage: card.coverImage || null,
    }))

    res.json(processedCards)
  } catch (error) {
    console.error("Get team cards error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get business cards
const getBusinessCards = async (req, res) => {
  try {
    const businessCards = await User.find({
      ownerId: req.user.id,
      userType: "business",
    }).select("-password")

    // Ensure image objects exist for all cards
    const processedCards = businessCards.map((card) => ({
      ...card.toObject(),
      avatar: card.avatar || null,
      coverImage: card.coverImage || null,
    }))

    res.json(processedCards)
  } catch (error) {
    console.error("Get business cards error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Create team card
const createTeamCard = async (req, res) => {
  try {
    // Auto-generate password if not provided
    if (!req.body.password) {
      req.body.password = generateRandomPassword()
    }

    // Validate input
    const { error } = createCardSchema.validate({
      ...req.body,
      cardType: "team",
    })
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const {
      username,
      email,
      password,
      phoneNumber,
      businessEmail,
      businessNumber,
      businessDescription,
      location,
      businessName,
    } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    })
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email or username",
      })
    }

    // Prepare team member data
    const teamMemberData = {
      username,
      email,
      password,
      phoneNumber,
      businessEmail,
      businessNumber,
      businessDescription,
      location,
      businessName,
      ownerId: req.user.id,
      userType: "team",
      isProfileComplete: true,
      avatar: null,
      coverImage: null,
    }

    // Handle avatar upload
    if (req.files && req.files.avatar && req.files.avatar[0]) {
      teamMemberData.avatar = {
        url: req.files.avatar[0].path,
        public_id: req.files.avatar[0].filename,
      }
    }

    // Handle cover image upload
    if (req.files && req.files.coverImage && req.files.coverImage[0]) {
      teamMemberData.coverImage = {
        url: req.files.coverImage[0].path,
        public_id: req.files.coverImage[0].filename,
      }
    }

    console.log("Creating team member with data:", teamMemberData)

    // Create team member
    const teamMember = new User(teamMemberData)
    await teamMember.save()

    // Return response without password
    const responseData = {
      id: teamMember._id,
      username: teamMember.username,
      email: teamMember.email,
      phoneNumber: teamMember.phoneNumber,
      businessEmail: teamMember.businessEmail,
      businessNumber: teamMember.businessNumber,
      businessDescription: teamMember.businessDescription,
      location: teamMember.location,
      businessName: teamMember.businessName,
      avatar: teamMember.avatar,
      coverImage: teamMember.coverImage,
      userType: teamMember.userType,
      createdAt: teamMember.createdAt,
      generatedPassword: password,
    }

    console.log("Team member created successfully:", responseData)

    res.status(201).json({
      message: "Team member created successfully",
      teamMember: responseData,
    })
  } catch (error) {
    console.error("Create team card error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Create business card
const createBusinessCard = async (req, res) => {
  try {
    // Auto-generate password if not provided
    if (!req.body.password) {
      req.body.password = generateRandomPassword()
    }

    // Validate input
    const { error } = createCardSchema.validate({
      ...req.body,
      cardType: "business",
    })

    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const {
      username,
      email,
      password,
      phoneNumber,
      businessEmail,
      businessNumber,
      businessDescription,
      location,
      businessName,
      socialMediaLinks,
      services,
      products,
      gallery,
    } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    })

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email or username",
      })
    }

    // Prepare business user data with all fields
    const businessUserData = {
      username,
      email,
      password,
      phoneNumber,
      businessEmail,
      businessNumber,
      businessDescription,
      location,
      businessName,
      // Initialize new fields with defaults
      socialMediaLinks: socialMediaLinks || {
        facebook: "",
        twitter: "",
        linkedIn: "",
        instagram: "",
      },
      services: services || [],
      products: products || [],
      gallery: gallery || [],
      ownerId: req.user.id,
      userType: "business",
      isProfileComplete: true,
      avatar: null,
      coverImage: null,
    }

    // Handle avatar upload
    if (req.files && req.files.avatar && req.files.avatar[0]) {
      businessUserData.avatar = {
        url: req.files.avatar[0].path,
        public_id: req.files.avatar[0].filename,
      }
    }

    // Handle cover image upload
    if (req.files && req.files.coverImage && req.files.coverImage[0]) {
      businessUserData.coverImage = {
        url: req.files.coverImage[0].path,
        public_id: req.files.coverImage[0].filename,
      }
    }

    // Handle gallery images upload
    if (req.files && req.files.gallery) {
      const galleryImages = req.files.gallery.map((file) => ({
        url: file.path,
        public_id: file.filename,
      }))
      businessUserData.gallery = [
        ...(businessUserData.gallery || []),
        ...galleryImages,
      ]
    }

    console.log("Creating business user with data:", businessUserData)

    // Create business user
    const businessUser = new User(businessUserData)
    await businessUser.save()

    // Return response without password but with all new fields
    const responseData = {
      id: businessUser._id,
      username: businessUser.username,
      email: businessUser.email,
      phoneNumber: businessUser.phoneNumber,
      businessEmail: businessUser.businessEmail,
      businessNumber: businessUser.businessNumber,
      businessDescription: businessUser.businessDescription,
      location: businessUser.location,
      businessName: businessUser.businessName,
      socialMediaLinks: businessUser.socialMediaLinks,
      services: businessUser.services,
      products: businessUser.products,
      gallery: businessUser.gallery,
      avatar: businessUser.avatar,
      coverImage: businessUser.coverImage,
      userType: businessUser.userType,
      createdAt: businessUser.createdAt,
      generatedPassword: password,
    }

    console.log("Business user created successfully:", responseData)

    res.status(201).json({
      message: "Business card created successfully",
      businessCard: responseData,
    })
  } catch (error) {
    console.error("Create business card error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Update team card
const updateTeamCard = async (req, res) => {
  try {
    const { id } = req.params

    // Check if the card belongs to the current user
    const card = await User.findOne({
      _id: id,
      ownerId: req.user.id,
      userType: "team",
    })

    if (!card) {
      return res.status(404).json({ message: "Team card not found" })
    }

    // Validate input
    const { error } = updateCardSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    // Prepare update data
    const updateData = { ...req.body, isProfileComplete: true }

    // Handle avatar upload
    if (req.files && req.files.avatar && req.files.avatar[0]) {
      // Delete old avatar if exists
      await safeDeleteImage(card.avatar)

      updateData.avatar = {
        url: req.files.avatar[0].path,
        public_id: req.files.avatar[0].filename,
      }
    }

    // Handle cover image upload
    if (req.files && req.files.coverImage && req.files.coverImage[0]) {
      // Delete old cover image if exists
      await safeDeleteImage(card.coverImage)

      updateData.coverImage = {
        url: req.files.coverImage[0].path,
        public_id: req.files.coverImage[0].filename,
      }
    }

    const updatedCard = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password")

    res.json({
      message: "Team card updated successfully",
      card: updatedCard,
    })
  } catch (error) {
    console.error("Update team card error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Update business card
const updateBusinessCard = async (req, res) => {
  try {
    const { id } = req.params

    // Check if the card belongs to the current user
    const card = await User.findOne({
      _id: id,
      ownerId: req.user.id,
      userType: "business",
    })

    if (!card) {
      return res.status(404).json({ message: "Business card not found" })
    }

    // Validate input
    const { error } = updateCardSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    // Prepare update data
    const updateData = { ...req.body, isProfileComplete: true }

    // Handle avatar upload
    if (req.files && req.files.avatar && req.files.avatar[0]) {
      // Delete old avatar if exists
      await safeDeleteImage(card.avatar)

      updateData.avatar = {
        url: req.files.avatar[0].path,
        public_id: req.files.avatar[0].filename,
      }
    }

    // Handle cover image upload
    if (req.files && req.files.coverImage && req.files.coverImage[0]) {
      // Delete old cover image if exists
      await safeDeleteImage(card.coverImage)

      updateData.coverImage = {
        url: req.files.coverImage[0].path,
        public_id: req.files.coverImage[0].filename,
      }
    }

    const updatedCard = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password")

    res.json({
      message: "Business card updated successfully",
      card: updatedCard,
    })
  } catch (error) {
    console.error("Update business card error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Delete team card
const deleteTeamCard = async (req, res) => {
  try {
    const { id } = req.params
    const card = await User.findOne({
      _id: id,
      ownerId: req.user.id,
      userType: "team",
    })

    if (!card) {
      return res.status(404).json({ message: "Team card not found" })
    }

    // Delete images from Cloudinary
    await safeDeleteImage(card.avatar)
    await safeDeleteImage(card.coverImage)

    // Delete the card
    await User.findByIdAndDelete(id)

    res.json({ message: "Team card deleted successfully" })
  } catch (error) {
    console.error("Delete team card error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Delete business card
const deleteBusinessCard = async (req, res) => {
  try {
    const { id } = req.params
    const card = await User.findOne({
      _id: id,
      ownerId: req.user.id,
      userType: "business",
    })

    if (!card) {
      return res.status(404).json({ message: "Business card not found" })
    }

    // Delete images from Cloudinary
    await safeDeleteImage(card.avatar)
    await safeDeleteImage(card.coverImage)

    // Delete the card
    await User.findByIdAndDelete(id)

    res.json({ message: "Business card deleted successfully" })
  } catch (error) {
    console.error("Delete business card error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

module.exports = {
  getMyCard,
  getTeamCards,
  getBusinessCards,
  createTeamCard,
  createBusinessCard,
  updateTeamCard,
  updateBusinessCard,
  deleteTeamCard,
  deleteBusinessCard,
}
