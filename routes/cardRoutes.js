const express = require("express")
const {
  getMyCard,
  getTeamCards,
  getBusinessCards,
  createTeamCard,
  createBusinessCard,
  updateTeamCard,
  updateBusinessCard,
  deleteTeamCard,
  deleteBusinessCard,
} = require("../controllers/cardController")
const auth = require("../middleware/auth")

const router = express.Router()

// GET /api/cards/my-card
router.get("/my-card", auth, getMyCard)

// GET /api/cards/team
router.get("/team", auth, getTeamCards)

// GET /api/cards/business
router.get("/business", auth, getBusinessCards)

// POST /api/cards/team
router.post("/team", auth, createTeamCard)

// POST /api/cards/business
router.post("/business", auth, createBusinessCard)

// PUT /api/cards/team/:id
router.put("/team/:id", auth, updateTeamCard)

// PUT /api/cards/business/:id
router.put("/business/:id", auth, updateBusinessCard)

// DELETE /api/cards/team/:id
router.delete("/team/:id", auth, deleteTeamCard)

// DELETE /api/cards/business/:id
router.delete("/business/:id", auth, deleteBusinessCard)

module.exports = router
