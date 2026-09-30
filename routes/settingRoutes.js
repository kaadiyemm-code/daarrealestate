const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settingController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.route('/')
  .get(getSettings)
  .put(protect, updateSettings);

module.exports = router;
