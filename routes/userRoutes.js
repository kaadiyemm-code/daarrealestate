const express = require('express');
const { getUsers, updateUserRole, deleteUser, toggleSavedProperty, toggleSavedWorker, updateProfile, createUserAdmin, updateUserAdmin, registerAgency, approveUser } = require('../controllers/userController');
const { protect, isAdmin: admin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protect, admin, getUsers);
router.post('/', protect, admin, createUserAdmin);
router.post('/register-agency', protect, registerAgency);
router.put('/:id/admin', protect, admin, updateUserAdmin);
router.put('/:id/approve', protect, admin, approveUser);
router.put('/:id/role', protect, admin, updateUserRole);
router.delete('/:id', protect, admin, deleteUser);
router.put('/:id', protect, updateProfile);
router.post('/saved/:propertyId', protect, toggleSavedProperty);
router.post('/saved-worker/:workerId', protect, toggleSavedWorker);

module.exports = router;
