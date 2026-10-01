const Property = require('../models/Property');
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const { createNotification } = require('../utils/notifyHelper');
const { getCache, setCache, deleteCache, deleteCachePattern } = require('../utils/redisClient');

// Use memory storage — works on Vercel (serverless) and avoids disk writes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Keliya sawirro ayaa la oggol yahay (Only images allowed)'), false);
  }
});

// Upload buffer directly to Cloudinary (no disk)
const uploadBufferToCloudinary = (buffer, folder = 'realestate/properties') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => { if (error) reject(error); else resolve(result.secure_url); }
    );
    stream.end(buffer);
  });
};


// @desc    Get properties (with map & filters)
// @route   GET /api/properties
// @access  Public
exports.getProperties = async (req, res, next) => {
  try {
    const { lat, lng, distance, minPrice, maxPrice, propertyType, category, listingType, hasWifi, hasBalcony, hasAC, hasParking, bedrooms, bathrooms } = req.query;

    // Build a unique cache key from query params
    const cacheKey = `properties:${JSON.stringify(req.query)}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, count: cached.length, data: cached, fromCache: true });
    }

    let query = {};

    // By default, public queries only show Approved properties
    if (req.query.approvalStatus) {
      query.approvalStatus = req.query.approvalStatus;
    } else if (req.query.includeAll !== 'true') {
      query.approvalStatus = 'Approved';
    }

    if (listingType) {
      query.listingType = listingType;
    }

    if (propertyType) {
      query.propertyType = propertyType;
    }

    if (category) {
      query.category = category;
    }

    // Geospatial search
    if (lat && lng && distance) {
      const distanceInKm = distance / 1000;
      query.location = {
        $geoWithin: {
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], distanceInKm / 6378.1]
        }
      };
    }

    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Boolean features
    if (hasWifi === 'true') query['features.hasWifi'] = true;
    if (hasBalcony === 'true') query['features.hasBalcony'] = true;
    if (hasAC === 'true') query['features.hasAC'] = true;
    if (hasParking === 'true') query['features.hasParking'] = true;

    // Number features
    if (bedrooms) query['features.bedrooms'] = parseInt(bedrooms, 10);
    if (bathrooms) query['features.bathrooms'] = parseInt(bathrooms, 10);

    const properties = await Property.find(query)
      .populate('owner', 'name phone email avatar role')
      .populate('agencyOwner', 'name phone email avatar role')
      .populate('assigned_agency_id', 'name phone email avatar role')
      .populate('assigned_worker_id', 'name phone email avatar role');

    // Cache for 5 minutes (300 seconds)
    await setCache(cacheKey, properties, 300);

    res.status(200).json({ success: true, count: properties.length, data: properties });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
exports.getProperty = async (req, res, next) => {
  try {
    const cacheKey = `property:${req.params.id}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, data: cached, fromCache: true });
    }

    const property = await Property.findById(req.params.id)
      .populate('owner', 'name phone email avatar role')
      .populate('agencyOwner', 'name phone email avatar role')
      .populate('assigned_agency_id', 'name phone email avatar role')
      .populate('assigned_worker_id', 'name phone email avatar role');
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Cache single property for 10 minutes
    await setCache(cacheKey, property, 600);

    res.status(200).json({ success: true, data: property });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new property
// @route   POST /api/properties
// @access  Private (All authenticated users)
exports.createProperty = async (req, res, next) => {
  try {
    req.body.owner = req.user.id;
    // Sync worker & agency fields
    const assignedWorkerId = req.body.assigned_worker_id || req.body.assigned_agency_id || req.body.agencyOwner;
    if (assignedWorkerId) {
      req.body.assigned_worker_id = assignedWorkerId;
      req.body.assigned_agency_id = assignedWorkerId;
      req.body.agencyOwner = assignedWorkerId;
    }

    // Admins post directly as Approved; regular users/agencies post as Pending for review
    if (req.user.role === 'Admin') {
      req.body.approvalStatus = req.body.approvalStatus || 'Approved';
    } else {
      req.body.approvalStatus = 'Pending';
    }

    const property = await Property.create(req.body);

    // Clear all property list caches so new property appears immediately
    await deleteCachePattern('properties:*');

    // Notify submitting user
    await createNotification({
      title: property.approvalStatus === 'Approved' ? '✅ Hantidaada waa la daabacay!' : '⏳ Hantidaada waxay ku jirtaa dib-u-eegis (Pending)',
      message: property.approvalStatus === 'Approved'
        ? `Hantidaada "${property.title}" hadda waa mid dadweynuhu toos u arki karaan.`
        : `Hantidaada "${property.title}" si guul leh ayaa loo diiwaangeliyay. Waxay dadweynaha u muuqan doontaa marka maamuluhu (Admin) ansixiyo.`,
      userId: req.user.id,
      relatedId: property._id,
      notifyAdmins: property.approvalStatus === 'Pending', // alert admins of new submission
    });

    res.status(201).json({ success: true, data: property });
  } catch (err) {
    next(err);
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private (Agent/Admin)
exports.updateProperty = async (req, res, next) => {
  try {
    let property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    const isOwner = property.owner.toString() === req.user.id;
    const isAssignedAgency = property.assigned_agency_id && property.assigned_agency_id.toString() === req.user.id;
    const isAgencyOwner = property.agencyOwner && property.agencyOwner.toString() === req.user.id;
    
    // Make sure user is property owner, assigned agency, or admin
    if (!isOwner && !isAssignedAgency && !isAgencyOwner && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this property' });
    }

    // Sync worker & agency fields
    const assignedWorkerId = req.body.assigned_worker_id || req.body.assigned_agency_id || req.body.agencyOwner;
    if (assignedWorkerId) {
      req.body.assigned_worker_id = assignedWorkerId;
      req.body.assigned_agency_id = assignedWorkerId;
      req.body.agencyOwner = assignedWorkerId;
    } else if (req.body.assigned_worker_id === null || req.body.assigned_agency_id === null) {
      req.body.assigned_worker_id = null;
      req.body.assigned_agency_id = null;
      req.body.agencyOwner = null;
    }

    // RESUBMISSION RESET: non-admin edits reset approval status so admin re-reviews
    if (req.user.role !== 'Admin') {
      req.body.approvalStatus = 'Pending';
      req.body.rejectionReason = '';
    }

    property = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Clear cache for this property and all list caches
    await deleteCache(`property:${req.params.id}`);
    await deleteCachePattern('properties:*');

    res.status(200).json({ success: true, data: property });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private (Agent/Admin)
exports.deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    const isOwner = property.owner.toString() === req.user.id;
    const isAssignedAgency = property.assigned_agency_id && property.assigned_agency_id.toString() === req.user.id;
    const isAgencyOwner = property.agencyOwner && property.agencyOwner.toString() === req.user.id;

    if (!isOwner && !isAssignedAgency && !isAgencyOwner && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this property' });
    }
    await property.deleteOne();

    // Clear cache for this property and all list caches
    await deleteCache(`property:${req.params.id}`);
    await deleteCachePattern('properties:*');

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};

// @desc    Upload property images to Cloudinary
// @route   POST /api/properties/upload
// @access  Private
exports.uploadPropertyImages = (req, res, next) => {
  const uploader = upload.array('images', 10);
  uploader(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Fadlan dooro ugu yaraan hal sawir (No files uploaded)' });
    }

    try {
      const uploadPromises = req.files.map(file =>
        uploadBufferToCloudinary(file.buffer, 'realestate/properties')
      );
      const cloudUrls = await Promise.all(uploadPromises);
      console.log(`[Cloudinary] Uploaded ${cloudUrls.length} property image(s):`, cloudUrls);
      return res.status(200).json({ success: true, data: cloudUrls });
    } catch (cloudErr) {
      console.error('[Cloudinary Upload Error]:', cloudErr.message);
      return res.status(500).json({ success: false, message: 'Sawirka Cloudinary lama gelin karo: ' + cloudErr.message });
    }
  });
};

// @desc    Get pending properties (for admin approval)
// @route   GET /api/properties/pending
// @access  Private (Admin)
exports.getPendingProperties = async (req, res, next) => {
  try {
    const properties = await Property.find({ approvalStatus: 'Pending' }).populate('owner', 'name email phone');
    res.status(200).json({ success: true, data: properties });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve or Reject a property
// @route   PUT /api/properties/:id/approve
// @access  Private (Admin)
exports.updatePropertyApproval = async (req, res, next) => {
  try {
    const { approvalStatus } = req.body;
    if (!['Approved', 'Rejected'].includes(approvalStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid approval status' });
    }
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { approvalStatus },
      { new: true }
    ).populate('owner', 'name email');

    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    // Send notification to owner
    if (property.owner) {
      await createNotification({
        title: approvalStatus === 'Approved' ? '🎉 Hambalyo! Hantidaada waa la ansixiyay' : '❌ Hantidaada dib baa loo celiyay',
        message: approvalStatus === 'Approved'
          ? `Guri/Hool/Hotel (${property.title}) oo aad diiwaangelisay waa la ansixiyay, hadda dadweynaha oo dhan ayaa arki kara.`
          : `Guri/Hool/Hotel (${property.title}) dib-u-eegistiisa lama aqbalin. Fadlan hubi macluumaadka ama xiriir maamulka.`,
        userId: property.owner._id || property.owner,
        relatedId: property._id,
        notifyAdmins: false,
      });
    }

    res.json({ success: true, data: property });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all properties owned or assigned to current user (with any status: Pending, Approved, Rejected)
// @route   GET /api/properties/my-properties
// @access  Private
exports.getMyProperties = async (req, res, next) => {
  try {
    const filter = (req.user.role === 'Agency' || req.user.role === 'Agent')
      ? {
          $or: [
            { owner: req.user.id },
            { agencyOwner: req.user.id },
            { assigned_agency_id: req.user.id }
          ]
        }
      : { owner: req.user.id };

    const properties = await Property.find(filter)
      .populate('owner', 'name phone email avatar')
      .populate('agencyOwner', 'name phone email avatar')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: properties.length, data: properties });
  } catch (err) {
    next(err);
  }
};

// @desc    Add review to property / agent
// @route   POST /api/properties/:id/reviews
// @access  Private
exports.addPropertyReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    if (!property.reviews) property.reviews = [];
    
    const newReview = {
      user: req.user.id,
      userName: req.user.name || 'Anonymous',
      userAvatar: req.user.avatar || '',
      rating: Number(rating) || 5,
      comment: comment || '',
      createdAt: new Date()
    };
    
    property.reviews.unshift(newReview);
    
    const totalRating = property.reviews.reduce((acc, item) => item.rating + acc, 0);
    property.averageRating = Number((totalRating / property.reviews.length).toFixed(1));

    await property.save();
    res.status(200).json({ success: true, data: property });
  } catch (err) {
    next(err);
  }
};

