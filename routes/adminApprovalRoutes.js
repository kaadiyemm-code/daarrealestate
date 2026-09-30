const express = require('express');
const router = express.Router();
const { approveEntity, rejectEntity, getPendingEntities } = require('../controllers/adminApprovalController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All routes require Admin privileges
router.use(protect);
router.use(authorize('Admin'));

router.get('/pending-entities', getPendingEntities);
router.put('/approve-entity/:type/:id', approveEntity);
router.put('/reject-entity/:type/:id', rejectEntity);

module.exports = router;
