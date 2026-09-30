const express = require('express');
const { getProperties, getProperty, createProperty, updateProperty, deleteProperty, uploadPropertyImages, getPendingProperties, updatePropertyApproval, addPropertyReview, getMyProperties } = require('../controllers/propertyController');
const { protect, isAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

// Specific routes BEFORE parameterized routes to avoid conflicts
router.get('/pending', protect, isAdmin, getPendingProperties);
router.get('/my-properties', protect, getMyProperties);
router.post('/upload', protect, uploadPropertyImages);

router.route('/')
  .get(getProperties)
  .post(protect, isAdmin, createProperty);

router.route('/:id')
  .get(getProperty)
  .put(protect, updateProperty)
  .delete(protect, deleteProperty);

router.put('/:id/approve', protect, isAdmin, updatePropertyApproval);
router.post('/:id/reviews', protect, addPropertyReview);

module.exports = router;
