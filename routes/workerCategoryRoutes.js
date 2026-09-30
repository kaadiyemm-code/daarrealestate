const express = require('express');
const {
  getWorkerCategories,
  createWorkerCategory,
  updateWorkerCategory,
  deleteWorkerCategory,
  seedDefaultCategories
} = require('../controllers/workerCategoryController');
const { protect, isAdmin: admin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', getWorkerCategories);
router.post('/seed', protect, admin, seedDefaultCategories);
router.post('/', protect, admin, createWorkerCategory);
router.put('/:id', protect, admin, updateWorkerCategory);
router.delete('/:id', protect, admin, deleteWorkerCategory);

module.exports = router;
