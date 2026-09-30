const express = require('express');
const { initiatePayment, paymentWebhook, getPaymentStatus, getTransactions, updateTransactionStatus, deleteTransaction } = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/initiate', protect, initiatePayment);
router.post('/webhook', paymentWebhook);
router.get('/transactions', protect, getTransactions);
router.get('/:id/status', protect, getPaymentStatus);
router.put('/:id/status', protect, updateTransactionStatus);
router.patch('/:id/status', protect, updateTransactionStatus);
router.delete('/:id', protect, deleteTransaction);

module.exports = router;
