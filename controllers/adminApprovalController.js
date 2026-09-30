const Property = require('../models/Property');
const Worker = require('../models/Worker');
const { createNotification } = require('../utils/notifyHelper');

// Helper to get model by type
const getModelByType = (type) => {
  if (type === 'property') return Property;
  if (type === 'worker') return Worker;
  return null;
};

// @desc    Approve an entity
// @route   PUT /api/admin/approve-entity/:type/:id
// @access  Private (Admin)
exports.approveEntity = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const Model = getModelByType(type);

    if (!Model) {
      return res.status(400).json({ success: false, message: 'Invalid entity type' });
    }

    const entity = await Model.findById(id);
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' });
    }

    entity.approvalStatus = 'Approved';
    entity.rejectionReason = ''; // Clear any previous rejection reasons
    await entity.save();

    // Notify the user if we can find the owner/userId
    const userId = entity.owner || entity.userId;
    if (userId) {
      const entityName = entity.title || entity.name || entity.companyName || 'Waxaad codsatay';
      await createNotification({
        title: '✅ Waa la ansixiyay (Approved)',
        message: `Hambalyo! '${entityName}' waa la ansixiyay. Hadda dadweynaha ayaa arki kara.`,
        userId: userId,
        relatedId: entity._id,
        notifyAdmins: false,
      });
    }

    res.status(200).json({ success: true, data: entity });
  } catch (err) {
    next(err);
  }
};

// @desc    Reject an entity
// @route   PUT /api/admin/reject-entity/:type/:id
// @access  Private (Admin)
exports.rejectEntity = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const { reason } = req.body;
    
    const Model = getModelByType(type);

    if (!Model) {
      return res.status(400).json({ success: false, message: 'Invalid entity type' });
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Fadlan ku dar sababta aad u diiday (Reason required)' });
    }

    const entity = await Model.findById(id);
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' });
    }

    entity.approvalStatus = 'Rejected';
    entity.rejectionReason = reason;
    await entity.save();

    // Notify the user
    const userId = entity.owner || entity.userId;
    if (userId) {
      const entityName = entity.title || entity.name || entity.companyName || 'Codsigaagii';
      await createNotification({
        title: '❌ Waa la diiday (Rejected)',
        message: `Waan ka xunnahay, '${entityName}' waa la diiday. Sababta: ${reason}. Waxaad wax ka bedeli kartaa oo dib u gudbin kartaa.`,
        userId: userId,
        relatedId: entity._id,
        notifyAdmins: false,
      });
    }

    res.status(200).json({ success: true, data: entity });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all pending entities (Properties and Workers) with search & filter
// @route   GET /api/admin/pending-entities
// @access  Private (Admin)
// Query params: type (property|worker), search, city, page, limit
exports.getPendingEntities = async (req, res, next) => {
  try {
    const { type, search, city, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let properties = [];
    let workers = [];

    // ── Properties ────────────────────────────────────────────────────────────
    if (!type || type === 'property') {
      const propQuery = { approvalStatus: 'Pending' };

      if (city) propQuery['location.city'] = city;

      if (search) {
        propQuery.$or = [
          { title: { $regex: search, $options: 'i' } },
          { 'location.address': { $regex: search, $options: 'i' } },
        ];
      }

      properties = await Property.find(propQuery)
        .populate('owner', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(type === 'property' ? skip : 0)
        .limit(type === 'property' ? parseInt(limit) : 200);
    }

    // ── Workers & Companies ──────────────────────────────────────────────────
    if (!type || type === 'worker') {
      const workerQuery = { approvalStatus: 'Pending' };

      if (city) workerQuery.city = city;

      if (search) {
        workerQuery.$or = [
          { name: { $regex: search, $options: 'i' } },
          { companyName: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { primaryPhone: { $regex: search, $options: 'i' } },
          { district: { $regex: search, $options: 'i' } },
          { role: { $regex: search, $options: 'i' } },
        ];
      }

      workers = await Worker.find(workerQuery)
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(type === 'worker' ? skip : 0)
        .limit(type === 'worker' ? parseInt(limit) : 200);
    }

    // Split workers into Individual and Company buckets
    const individualWorkers = workers.filter(w => w.providerType !== 'Company');
    const companies = workers.filter(w => w.providerType === 'Company');

    res.status(200).json({
      success: true,
      data: {
        properties,
        workers: individualWorkers,
        companies,
      }
    });
  } catch (err) {
    next(err);
  }
};
