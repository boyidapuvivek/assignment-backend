// config/cloudinary.js - Add better error handling
const cloudinary = require("cloudinary").v2
const { CloudinaryStorage } = require("multer-storage-cloudinary")
const multer = require("multer")

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Configure Cloudinary storage for multer with better error handling
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "user-images",
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
      transformation: [
        { width: 1000, height: 1000, crop: "limit", quality: "auto" },
      ],
      public_id: `${file.fieldname}_${Date.now()}`,
    }
  },
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed!"), false)
    }
  },
})

// Error handling middleware
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ message: "File too large. Maximum size is 10MB." })
    }
  }
  if (error.message === "Only image files are allowed!") {
    return res.status(400).json({ message: error.message })
  }
  next(error)
}

// Function to delete image from cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    if (publicId) {
      const result = await cloudinary.uploader.destroy(publicId)
      console.log("Cloudinary delete result:", result)
    }
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error)
  }
}

module.exports = {
  cloudinary,
  upload,
  deleteFromCloudinary,
  handleMulterError,
}
