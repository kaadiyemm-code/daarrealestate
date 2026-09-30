const Worker = require('../models/Worker');
const Booking = require('../models/Booking');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createNotification } = require('../utils/notifyHelper');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const cloudinary = require('../utils/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Multer storage config (Cloudinary)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'realestate_workers',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});
const upload = multer({ storage });

// Export safe multer middleware for use in routes
exports.uploadWorkerMiddleware = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'cv', maxCount: 1 },
    { name: 'portfolioImages', maxCount: 10 },
  ])(req, res, (err) => {
    if (err) {
      console.warn('Multer upload warning (proceeding without file):', err.message);
    }
    next();
  });
};

// @desc    Get all workers with search and filtering
// @route   GET /api/workers
// @access  Public
exports.getWorkers = async (req, res, next) => {
  try {
    const { category, search, district, availability } = req.query;
    let query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (availability) {
      query.availability = availability;
    }

    if (district) {
      query.district = { $regex: district, $options: 'i' };
    }

const mongoose = require('mongoose');

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
        { district: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { skills: { $in: [new RegExp(search, 'i')] } }
      ];
      if (mongoose.Types.ObjectId.isValid(search)) {
        query.$or.push({ _id: search });
      }
    }

    // Only show Approved workers unless it's an Admin requesting
    if (!req.user || req.user.role !== 'Admin') {
      query.approvalStatus = 'Approved';
    }

    const workers = await Worker.find(query).populate('userId', 'name email phone role avatar').sort({ rating: -1, createdAt: -1 });

    const isAdmin = req.user && req.user.role === 'Admin';
    const sanitizedWorkers = workers.map(w => {
      const obj = w.toObject ? w.toObject() : { ...w };
      const isOwner = req.user && (
        (obj.userId && obj.userId._id ? obj.userId._id.toString() === req.user.id.toString() : obj.userId?.toString() === req.user.id.toString()) ||
        (obj.registeredBy && obj.registeredBy.toString() === req.user.id.toString())
      );
      if (!isAdmin && !isOwner) {
        delete obj.identityNumber;
        delete obj.identityDocument;
        delete obj.identityExpiryDate;
      }
      return obj;
    });

    res.status(200).json({
      success: true,
      count: sanitizedWorkers.length,
      data: sanitizedWorkers
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single worker
// @route   GET /api/workers/:id
// @access  Public
exports.getWorkerById = async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Shaqaale lama helin (Worker not found)' });
    }

    const isAdmin = req.user && req.user.role === 'Admin';
    const isOwner = req.user && (
      (worker.userId && worker.userId.toString() === req.user.id.toString()) ||
      (worker.registeredBy && worker.registeredBy.toString() === req.user.id.toString())
    );
    const workerData = worker.toObject();
    if (!isAdmin && !isOwner) {
      delete workerData.identityNumber;
      delete workerData.identityDocument;
      delete workerData.identityExpiryDate;
    }

    res.status(200).json({ success: true, data: workerData });
  } catch (err) {
    next(err);
  }
};

// @desc    Create / Register new worker
// @route   POST /api/workers
// @access  Private / Public (Admin or registration)
exports.createWorker = async (req, res, next) => {
  try {
    const targetUserId = (req.user && req.user.role === 'Admin' && req.body.userId)
      ? req.body.userId
      : (req.user ? req.user.id : null);

    if (targetUserId) {
      const existingProfile = await Worker.findOne({ userId: targetUserId });
      if (existingProfile) {
        return res.status(400).json({
          success: false,
          alreadyRegistered: true,
          message: req.user && req.user.role === 'Admin'
            ? 'Isticmaalahaan (User) horey ayuu u ahaa shaqaale ama wakaalad. Mar kale laguma dari karo.'
            : 'Hore ayaad isku diiwaangelisay. Fadlan isticmaal qaybta Edit si aad wax uga beddesho profile-kaaga.',
          data: existingProfile
        });
      }
    }

    const {
      providerType,
      companyName,
      teamSize,
      businessLicense,
      tinOrLicenseNumber,
      businessType,
      serviceType,
      logo,
      businessDocument,
      officeAddress,
      name,
      phone,
      primaryPhone,
      secondaryPhone,
      email,
      role,
      skillCategory,
      category,
      city,
      district,
      identityType,
      identityNumber,
      identityDocument,
      identityExpiryDate,
      guarantorPhone,
      experienceYears,
      hourlyRate,
      dailyRate,
      monthlyRate,
      currency,
      bio,
      skills,
      portfolio,
      avatar,
      availability,
      age,
      gender,
      address,
      education,
      cvFile,
      previousExperience
    } = req.body;

    const finalName = (companyName || name || '').trim();
    if (!finalName || !phone || !role || !district) {
      return res.status(400).json({
        success: false,
        message: 'Fadlan buuxi Magaca/Shirkadda, Taleefanka, Shaqada/Adeegga iyo Xaafadda'
      });
    }

    // ── Parse skills (support array, JSON, string, or FormData bracket notation)
    let finalSkills = [];
    if (Array.isArray(skills)) {
      finalSkills = skills.map(s => String(s).trim()).filter(Boolean);
    } else if (req.body['skills[]']) {
      const raw = req.body['skills[]'];
      finalSkills = Array.isArray(raw) ? raw.map(s => String(s).trim()).filter(Boolean) : [String(raw).trim()];
    } else if (typeof skills === 'string') {
      try {
        const parsed = JSON.parse(skills);
        if (Array.isArray(parsed)) finalSkills = parsed;
        else finalSkills = skills.split(',').map(s => s.trim()).filter(Boolean);
      } catch (e) {
        finalSkills = skills.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    // ── Parse languages
    let parsedLanguages = [];
    if (Array.isArray(req.body.languages)) {
      parsedLanguages = req.body.languages.map(l => String(l).trim()).filter(Boolean);
    } else if (req.body['languages[]']) {
      const raw = req.body['languages[]'];
      parsedLanguages = Array.isArray(raw) ? raw.map(l => String(l).trim()).filter(Boolean) : [String(raw).trim()];
    } else if (typeof req.body.languages === 'string') {
      parsedLanguages = req.body.languages.split(',').map(l => l.trim()).filter(Boolean);
    }

    // ── Parse experience
    let parsedExperience = [];
    if (Array.isArray(previousExperience)) {
      parsedExperience = previousExperience.map(e => ({
        companyName: e.companyName || e.company || '',
        role: e.role || e.title || '',
        duration: e.duration || e.years || '',
        description: e.description || ''
      })).filter(e => e.companyName || e.role);
    } else {
      const expMap = {};
      Object.keys(req.body).forEach(key => {
        const match = key.match(/^experience\[(\d+)\]\[(.+)\]$/);
        if (match) {
          const idx = parseInt(match[1]);
          const field = match[2];
          if (!expMap[idx]) expMap[idx] = {};
          expMap[idx][field] = req.body[key];
        }
      });
      parsedExperience = Object.values(expMap).map(e => ({
        companyName: e.companyName || e.company || '',
        role: e.role || e.title || '',
        duration: e.duration || e.years || '',
        description: e.description || ''
      })).filter(e => e.companyName || e.role);
    }

    // ── Handle uploaded files (multer or pre-uploaded paths)
    let avatarPath = avatar || '';
    let cvPath = cvFile || req.body.cv || '';
    let portfolioImages = Array.isArray(portfolio) ? portfolio.map(p => ({
      title: p.title || 'Portfolio',
      description: p.description || '',
      image: p.image || p.url || '',
      url: p.url || p.image || ''
    })) : [];

    if (req.files) {
      if (req.files['avatar'] && req.files['avatar'].length > 0) {
        avatarPath = req.files['avatar'][0].path;
      }
      if (req.files['cv'] && req.files['cv'].length > 0) {
        cvPath = req.files['cv'][0].path;
      }
      if (req.files['portfolioImages'] && req.files['portfolioImages'].length > 0) {
        const uploadedItems = req.files['portfolioImages'].map(f => ({
          image: f.path,
          url: f.path,
          title: req.body.portfolioTitle || 'Portfolio',
          description: req.body.portfolioDesc || '',
        }));
        portfolioImages = [...portfolioImages, ...uploadedItems];
      }
    }

    // ── Build personalInfo object
    let personalInfo = {};
    if (req.body.personalInfo && typeof req.body.personalInfo === 'object') {
      personalInfo = {
        age: req.body.personalInfo.age ? Number(req.body.personalInfo.age) : (age ? Number(age) : undefined),
        gender: req.body.personalInfo.gender || gender || '',
        address: (req.body.personalInfo.address || address || '').trim(),
        education: (req.body.personalInfo.education || education || '').trim(),
        languages: req.body.personalInfo.languages || parsedLanguages
      };
    } else {
      if (age) personalInfo.age = Number(age);
      if (gender) personalInfo.gender = gender;
      if (address) personalInfo.address = address.trim();
      if (education) personalInfo.education = education.trim();
      if (parsedLanguages.length > 0) personalInfo.languages = parsedLanguages;
    }

    // ── Sanitize availability
    const validAvailability = ['Available', 'Busy', 'On Leave', 'Part-Time'];
    const safeAvailability = validAvailability.includes(availability) ? availability : 'Available';

    const isCompany = providerType === 'Company';

    const workerData = {
      providerType: isCompany ? 'Company' : 'Individual',
      companyName: (companyName || (isCompany ? finalName : '')).trim(),
      teamSize: Number(teamSize) || (isCompany ? 5 : 1),
      businessLicense: (businessLicense || tinOrLicenseNumber || '').trim(),
      tinOrLicenseNumber: (tinOrLicenseNumber || businessLicense || '').trim(),
      businessType: businessType || '',
      serviceType: (serviceType || role || '').trim(),
      logo: logo || '',
      businessDocument: businessDocument || '',
      officeAddress: (officeAddress || '').trim(),
      name: finalName,
      phone: (primaryPhone || phone || '').trim(),
      primaryPhone: (primaryPhone || phone || '').trim(),
      secondaryPhone: (secondaryPhone || '').trim(),
      email: email ? email.trim() : '',
      role: role.trim(),
      skillCategory: skillCategory || '',
      category: category || skillCategory || '',
      city: city ? city.trim() : 'Mogadishu',
      district: district.trim(),
      identityType: identityType || 'NIRA / National ID',
      identityNumber: (identityNumber || '').trim(),
      identityDocument: identityDocument || '',
      identityExpiryDate: identityExpiryDate ? new Date(identityExpiryDate) : null,
      guarantorPhone: (guarantorPhone || '').trim(),
      experienceYears: Number(experienceYears) || 0,
      hourlyRate: Number(hourlyRate) || 0,
      dailyRate: Number(dailyRate) || 0,
      monthlyRate: Number(monthlyRate) || 0,
      currency: currency || 'USD',
      bio: bio ? bio.trim() : '',
      skills: finalSkills,
      languages: parsedLanguages,
      portfolio: portfolioImages,
      avatar: avatarPath,
      personalInfo,
      previousExperience: parsedExperience,
      cvFile: cvPath,
      availability: safeAvailability,
    };

    // Determine assigned user
    // Create new worker profile
    const worker = await Worker.create({
      ...workerData,
      isVerified: req.user && req.user.role === 'Admin',
      registeredBy: req.user ? req.user.id : null,
      userId: targetUserId,
      approvalStatus: req.user && req.user.role === 'Admin' ? 'Approved' : 'Pending'
    });

    // If an Admin assigned an existing user, promote their role & notify them
    if (req.user && req.user.role === 'Admin' && req.body.userId) {
      try {
        const User = require('../models/User');
        const Notification = require('../models/Notification');
        const targetRole = isCompany ? 'Company' : 'Worker';
        await User.findByIdAndUpdate(req.body.userId, {
          role: targetRole,
          isApproved: true
        });

        await Notification.create({
          userId: req.body.userId,
          title: 'Waxaa laguu xilsaaray Shaqaale / Adeeg-bixiye',
          message: `Maamulka (Admin) ayaa kuu diiwaangeliyay oo kuu xilsaaray shaqada "${workerData.role}". Waxaad hadda toos u geli kartaa Dashboard-kaaga shaqaalaha!`,
          target: 'worker',
          isGlobal: false
        });
      } catch (assignErr) {
        console.error('Error assigning user role/notification in createWorker:', assignErr.message);
      }
    }

    const populatedWorker = await Worker.findById(worker._id).populate('userId', 'name email phone role avatar');

    res.status(201).json({
      success: true,
      message: isCompany
        ? 'Shirkadda si guul leh ayaa loo diiwaangeliyay.'
        : 'Shaqaalaha si guul leh ayaa loo diiwaangeliyay oo loo xilsaaray.',
      data: populatedWorker || worker
    });
  } catch (err) {
    console.error('createWorker Error:', err.message, err.errors ? JSON.stringify(err.errors) : '');
    next(err);
  }
};


// @desc    Update worker
// @route   PUT /api/workers/:id
// @access  Private (Owner or Admin)
exports.updateWorker = async (req, res, next) => {
  try {
    let worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    // Permission check: Owner or Admin
    const isOwner = req.user && (
      (worker.userId && worker.userId.toString() === req.user.id.toString()) ||
      (worker.registeredBy && worker.registeredBy.toString() === req.user.id.toString())
    );
    const isAdmin = req.user && req.user.role === 'Admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Fasax uma lihid inaad wax ka beddesho shaqaalahan' });
    }

    if (req.body.skills && typeof req.body.skills === 'string') {
      req.body.skills = req.body.skills.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Process portfolio items if updated
    if (req.body.portfolio && Array.isArray(req.body.portfolio)) {
      req.body.portfolio = req.body.portfolio.map(p => ({
        title: p.title || 'Shaqo Hore',
        description: p.description || '',
        image: p.image || p.url || '',
        url: p.url || p.image || '',
        completedAt: p.completedAt || Date.now()
      })).filter(p => p.image || p.url);
    }

    // Non-admins cannot self-approve or switch providerType
    if (!isAdmin) {
      delete req.body.isVerified;
      delete req.body.providerType; // locked to whatever was registered
      // Only reset to Pending if editing profile fields (not just avatar/portfolio)
      const avatarOrPortfolioOnly = Object.keys(req.body).every(k =>
        ['avatar', 'portfolio'].includes(k)
      );
      if (!avatarOrPortfolioOnly) {
        req.body.approvalStatus = 'Pending';
        req.body.rejectionReason = '';
      }
    }

    worker = await Worker.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, message: 'Profile-kaaga si guul leh ayaa loo cusboonaysiiyay!', data: worker });
  } catch (err) {
    next(err);
  }
};

// @desc    Assign / Link a registered user to an existing Worker
// @route   PATCH /api/workers/:id/assign-user
// @access  Private (Admin)
exports.assignWorkerUser = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Shaqaalaha lama helin' });
    }

    const User = require('../models/User');
    const Notification = require('../models/Notification');

    if (userId) {
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'Isticmaalaha lama helin' });
      }

      worker.userId = userId;
      worker.isVerified = true;
      worker.approvalStatus = 'Approved';
      await worker.save();

      const targetRole = worker.providerType === 'Company' ? 'Company' : 'Worker';
      await User.findByIdAndUpdate(userId, { role: targetRole, isApproved: true });

      try {
        await Notification.create({
          userId: userId,
          title: 'Waxaa laguu xilsaaray Shaqaale',
          message: `Waxaa laguu xilsaaray shaqada "${worker.role}". Hadda waxaad toos u geli kartaa Dashboard-ka shaqaalaha!`,
          target: 'worker',
          isGlobal: false
        });
      } catch (ne) {
        console.log('Notification error:', ne.message);
      }
    } else {
      const oldUserId = worker.userId;
      worker.userId = null;
      await worker.save();
      if (oldUserId) {
        const otherWorkers = await Worker.countDocuments({ userId: oldUserId });
        if (otherWorkers === 0) {
          await User.findByIdAndUpdate(oldUserId, { role: 'Customer' });
        }
      }
    }

    const populatedWorker = await Worker.findById(worker._id).populate('userId', 'name email phone role avatar');
    res.status(200).json({
      success: true,
      message: userId ? 'Isticmaalaha si guul leh ayaa loogu xilsaaray!' : 'Xilsaarkii waa laga qaaday!',
      data: populatedWorker
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete worker
// @route   DELETE /api/workers/:id
// @access  Private (Admin only)
exports.deleteWorker = async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    if (req.user && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Keliya Admin ayaa awood u leh inuu tirtiro shaqaalaha' });
    }

    // Revert user role if linked
    if (worker.userId) {
      const User = require('../models/User');
      await User.findByIdAndUpdate(worker.userId, { role: 'Customer' });
    }

    await worker.deleteOne();
    res.status(200).json({ success: true, message: 'Shaqaalaha waa la tirtiray' });
  } catch (err) {
    next(err);
  }
};

// @desc    Add review to worker
// @route   POST /api/workers/:id/reviews
// @access  Private / Authenticated
exports.addWorkerReview = async (req, res, next) => {
  try {
    const { rating, comment, userName, userAvatar } = req.body;
    const worker = await Worker.findById(req.params.id);

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    if (!comment || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Fadlan bixi qiimeynta (rating) iyo faallada (comment)'
      });
    }

    const review = {
      user: req.user ? req.user.id : null,
      userName: userName || (req.user ? req.user.name : 'Macaamiil'),
      userAvatar: userAvatar || (req.user ? req.user.avatar : ''),
      rating: Number(rating),
      comment: comment.trim(),
      createdAt: new Date()
    };

    worker.reviews.push(review);

    // Calculate new average rating
    const totalRating = worker.reviews.reduce((acc, r) => acc + r.rating, 0);
    worker.rating = Number((totalRating / worker.reviews.length).toFixed(1));

    await worker.save();

    res.status(201).json({
      success: true,
      message: 'Dib-u-eegista si guul leh ayaa loo kaydiyay',
      data: worker
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle verified status or availability
// @route   PATCH /api/workers/:id/status
// @access  Private (Admin or Worker Owner)
exports.toggleWorkerStatus = async (req, res, next) => {
  try {
    const { isVerified, availability } = req.body;
    const worker = await Worker.findById(req.params.id);

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    const isOwner = req.user && worker.userId && worker.userId.toString() === req.user.id.toString();
    const isAdmin = req.user && req.user.role === 'Admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Fasax uma lihid inaad xaaladdan beddesho' });
    }

    if (isVerified !== undefined && isAdmin) worker.isVerified = isVerified;
    if (availability !== undefined) worker.availability = availability;

    await worker.save();
    res.status(200).json({ success: true, data: worker });
  } catch (err) {
    next(err);
  }
};

// @desc    Book a worker for a specific time slot
// @route   POST /api/workers/:id/book
// @access  Private (Authenticated User)
exports.bookWorker = async (req, res, next) => {
  try {
    const {
      date,
      startTime,
      endTime,
      hours,
      totalCost,
      neighborhood,
      locationAddress,
      serviceType,
      customerName,
      customerPhone,
      taskDetails,
      idNumber
    } = req.body;
    const workerId = req.params.id;
    const userId = req.user.id;

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Shaqaale lama helin (Worker not found)' });
    }

    // Check if worker already has an Accepted booking for this time slot
    const existing = await Booking.findOne({
      entityId: workerId,
      bookingDate: date,
      timeSlot: startTime,
      bookingStatus: 'Accepted'
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Waqtigaan waa mashquul hore ayaa loo qaatay (Time slot already accepted)' });
    }

    // Save booking as Pending - waiting for worker to Accept or Reject
    const providerUserId = worker.userId || null;
    const booking = await Booking.create({
      customer: userId,
      entityType: worker.providerType === 'Company' ? 'CompanyService' : 'Worker',
      entityId: workerId,
      provider: providerUserId,
      bookingDate: date,
      timeSlot: startTime ? `${startTime} - ${endTime || ''}` : 'Full Day',
      totalPrice: Number(totalCost),
      currency: 'USD',
      notes: taskDetails || '',
      bookingStatus: 'Pending',
      paymentStatus: 'Pending',
      customerName,
      customerPhone,
      customerLocation: `${neighborhood} - ${locationAddress}`,
      idNumber: idNumber || '',
      serviceType: serviceType || worker.role,
    });

    // Notify customer, worker/company, and admins with proper roles
    const isCompanyTarget = worker.providerType === 'Company';
    const providerLabel = isCompanyTarget ? 'shirkadda' : 'shaqaalaha';
    const providerTitle = isCompanyTarget ? 'Shirkad' : 'Shaqaale';

    // 1. Notify the customer who made the booking
    await createNotification({
      title: `🎉 Dalabkaagii waa la diray (${providerTitle} Booking)`,
      message: `Waxaad dalbatay ${providerLabel}: ${worker.name} (${booking.serviceType || worker.role}). Taariikhda: ${booking.date} ${booking.startTime}. Fadlan sug inta laga xaqiijinayo.`,
      userId: req.user._id,
      relatedId: booking._id,
      notifyAdmins: false,
    });

    // 2. Notify the worker or company owner
    if (worker.userId && worker.userId.toString() !== req.user._id.toString()) {
      await createNotification({
        title: `📋 Dalab Cusub oo ${providerTitle} ah (New Booking)`,
        message: `${booking.customerName || req.user.name} waxay kuu soo direen dalab shaqo/adeeg ah: ${booking.serviceType || worker.role}. Taariikhda: ${booking.date} ${booking.startTime}.`,
        userId: worker.userId,
        relatedId: booking._id,
        notifyAdmins: false,
      });
    }

    // 3. Notify admins
    await createNotification({
      title: `🔔 Booking Cusub (${providerTitle})`,
      message: `${booking.customerName || req.user.name} waxay dalbadeen ${providerLabel}: ${worker.name} (${booking.serviceType || worker.role}). Taariikh: ${booking.date}.`,
      userId: null,
      relatedId: booking._id,
      notifyAdmins: true,
      excludeUserIds: [req.user._id, worker.userId]
    });

    res.status(201).json({
      success: true,
      message: 'Dalabkaaga waa la diray, fadlan sug inta shaqaaluhu ka aqbalayo ama diidayo.',
      data: booking
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all bookings for a worker (full details if owner/admin, public slots otherwise)
// @route   GET /api/workers/:id/bookings
// @access  Public / Private
exports.getWorkerBookings = async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    let isOwnerOrAdmin = false;
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const User = require('../models/User');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user && (user.role === 'Admin' || (worker.userId && worker.userId.toString() === user._id.toString()))) {
          isOwnerOrAdmin = true;
        }
      } catch (e) {}
    }

    let bookings;
    if (isOwnerOrAdmin) {
      bookings = await Booking.find({
        $or: [
          { entityId: req.params.id },
          ...(worker.userId ? [{ provider: worker.userId }] : [])
        ]
      })
        .populate('customer', 'name phone email avatar')
        .sort({ createdAt: -1 });

      const enriched = bookings.map(b => {
        const obj = b.toObject();
        const totalPrice = Number(obj.totalPrice) || 0;
        const appFeeRate = Number(obj.appFeeRate !== undefined ? obj.appFeeRate : 10);
        const appFeeAmount = Number(
          obj.appFeeAmount !== undefined && obj.appFeeAmount > 0
            ? obj.appFeeAmount
            : Math.round((totalPrice * appFeeRate) / 100)
        );
        const agencyPaymentStatus = obj.agencyPaymentStatus || 'Unpaid';
        const isAppFeePaid = agencyPaymentStatus === 'Paid';
        const workerEarnings = Math.max(0, totalPrice - appFeeAmount);

        obj.totalPrice = totalPrice;
        obj.totalCost = totalPrice;
        obj.appFeeRate = appFeeRate;
        obj.appFeeAmount = appFeeAmount;
        obj.agencyPaymentStatus = agencyPaymentStatus;
        obj.isAppFeePaid = isAppFeePaid;
        obj.isAppFeeOwed = !isAppFeePaid && appFeeAmount > 0;
        obj.workerEarnings = workerEarnings;
        obj.date = obj.bookingDate;
        obj.status = obj.bookingStatus;
        return obj;
      });

      return res.status(200).json({ success: true, count: enriched.length, data: enriched });
    } else {
      bookings = await Booking.find({ entityId: req.params.id, bookingStatus: 'Accepted' })
        .select('_id bookingDate timeSlot bookingStatus');
      return res.status(200).json({ success: true, data: bookings });
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Get all bookings for a worker with user details
// @route   GET /api/workers/:id/admin-bookings
// @access  Private (Admin)
exports.getAdminWorkerBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ entityId: req.params.id })
      .populate('customer', 'name phone email avatar')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
};

// @desc    Upload worker files (Avatar, CV, Portfolio)
// @route   POST /api/workers/upload
// @access  Private (Authenticated user or admin)
exports.uploadWorkerFiles = (req, res, next) => {
  const uploader = upload.array('files', 10);
  uploader(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Fadlan dooro fayl' });
    }

    try {
      const fileUrls = await Promise.all(req.files.map(async (file) => {
        // If CloudinaryStorage was used, file.path is already the Cloudinary URL
        if (file.path && file.path.startsWith('http')) {
          return file.path;
        }
        if (file.secure_url) {
          return file.secure_url;
        }
        // If stored temporarily on disk, upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(file.path, {
          folder: 'realestate/workers',
          resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
        });
        try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch(e){}
        return uploadResult.secure_url;
      }));

      console.log('[Worker Upload] Uploaded files to Cloudinary:', fileUrls);
      res.status(200).json({ success: true, data: fileUrls, urls: fileUrls });
    } catch (uploadErr) {
      console.error('[Worker Upload Error]:', uploadErr.message);
      const fallbackUrls = req.files.map(file => file.path || `/uploads/${file.filename}`);
      res.status(200).json({ success: true, data: fallbackUrls, urls: fallbackUrls });
    }
  });
};

// @desc    Update booking status (e.g. to Completed)
// @route   PATCH /api/workers/bookings/:bookingId/status
// @access  Private (Worker, Customer, or Admin)
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const worker = await Worker.findById(booking.entityId);
    const isWorkerOwner = worker && worker.userId && worker.userId.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'Admin';
    const isCustomer = booking.customer && booking.customer.toString() === req.user.id.toString();

    if (!isWorkerOwner && !isAdmin && !isCustomer) {
      return res.status(403).json({ success: false, message: 'Fasax uma lihid inaad beddesho booking-kan' });
    }

    booking.bookingStatus = status;
    await booking.save();

    if (status === 'Completed' || status === 'Rejected') {
      await Worker.findByIdAndUpdate(booking.entityId, { availability: 'Available' });
    } else if (status === 'Accepted') {
      await Worker.findByIdAndUpdate(booking.entityId, { availability: 'Busy' });
    }

    // Send notifications based on status change
    const statusMessages = {
      Accepted: { title: '✅ Shaqadaada Waa La Aqbalay!', msg: `Shaqaalaha ayaa aqbalay codsigaaga. Taariikh: ${booking.date} ${booking.startTime}.` },
      Rejected: { title: '❌ Shaqadaada Waa La Diidday', msg: `Shaqaalaha wuu diidday codsigaaga. Fadlan isku day shaqaale kale.` },
      Completed: { title: '🎉 Shaqada Waa La Dhammeeyay!', msg: `Shaqada waa la dhammeeyay. Fadlan qiimee shaqaalaha.` },
      Cancelled: { title: '🚫 Booking Waa La Joojiyay', msg: `Booking-gaaga ayaa la joojiyay.` },
    };
    const notifInfo = statusMessages[status];
    if (notifInfo && booking.customer) {
      await createNotification({
        title: notifInfo.title,
        message: notifInfo.msg,
        userId: booking.customer,
        relatedId: booking._id,
        notifyAdmins: false,
      });
    }
    // Notify admins too
    await createNotification({
      title: `📌 Booking Status: ${status}`,
      message: `Booking ${booking._id} status la beddelay: ${status}. Customer: ${booking.customerName}.`,
      relatedId: booking._id,
      notifyAdmins: true,
    });

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete worker review
// @route   DELETE /api/workers/:id/reviews/:reviewId
// @access  Private (Admin)
exports.deleteWorkerReview = async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    worker.reviews = worker.reviews.filter(r => r._id.toString() !== req.params.reviewId);
    
    // Recalculate rating
    if (worker.reviews.length > 0) {
      const totalRating = worker.reviews.reduce((acc, r) => acc + r.rating, 0);
      worker.rating = Number((totalRating / worker.reviews.length).toFixed(1));
    } else {
      worker.rating = 5.0; // default
    }

    await worker.save();
    res.status(200).json({ success: true, data: worker });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user's worker profile
// @route   GET /api/workers/me
// @access  Private
exports.getMyWorkerProfile = async (req, res, next) => {
  try {
    let worker = await Worker.findOne({ userId: req.user.id }).populate('userId', 'name email phone role avatar');
    if (!worker && req.user.role !== 'Admin') {
      worker = await Worker.findOne({ registeredBy: req.user.id }).populate('userId', 'name email phone role avatar');
    }
    if (!worker) {
      return res.status(404).json({ success: false, message: 'You do not have a worker profile' });
    }
    res.status(200).json({ success: true, data: worker });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve or Reject Worker
// @route   PATCH /api/workers/:id/approve
// @access  Private (Admin)
exports.approveWorker = async (req, res, next) => {
  try {
    const { status } = req.body; // 'Approved' or 'Rejected'
    const worker = await Worker.findById(req.params.id);

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    if (['Approved', 'Rejected'].includes(status)) {
      worker.approvalStatus = status;
      if (status === 'Approved') {
        worker.isVerified = true;
        if (worker.userId) {
          const User = require('../models/User');
          const targetRole = worker.providerType === 'Company' ? 'Company' : 'Worker';
          await User.findByIdAndUpdate(worker.userId, { role: targetRole });
          await createNotification({
            title: '🎉 Xaqiijinta Koontada (Account Approved)',
            message: `Hambalyo! Codsigaaga ${worker.providerType === 'Company' ? 'shirkadda' : 'shaqaalaha'} (${worker.name}) waa la aqbalay. Hadda waxaad toos u heli kartaa macaamiil iyo ballamo.`,
            userId: worker.userId
          });
        }
      } else if (status === 'Rejected') {
        worker.isVerified = false;
        if (worker.userId) {
          const User = require('../models/User');
          await User.findByIdAndUpdate(worker.userId, { role: 'Customer' });
        }
      }
      await worker.save();
    }
    
    res.status(200).json({ success: true, data: worker });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all worker bookings made by the current logged-in customer
// @route   GET /api/workers/my-bookings
// @access  Private
exports.getCustomerWorkerBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ customer: req.user.id })
      .populate('provider', 'name phone avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all bookings received by the current logged-in worker/company
// @route   GET /api/workers/my-received-bookings
// @access  Private (Worker/Company)
exports.getWorkerReceivedBookings = async (req, res, next) => {
  try {
    const worker = await Worker.findOne({ userId: req.user.id });
    if (!worker) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    const bookings = await Booking.find({ provider: req.user.id })
      .populate('customer', 'name phone email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all worker bookings across all workers
// @route   GET /api/workers/bookings/all
// @access  Private (Admin)
exports.getAllWorkerBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('customer', 'name phone email avatar')
      .populate('provider', 'name phone email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin cancel a worker booking
// @route   PATCH /api/workers/bookings/:bookingId/cancel
// @access  Private (Admin)
exports.adminCancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.bookingStatus = 'Cancelled';
    booking.cancellationBy = 'Admin';
    await booking.save();

    // Free worker availability
    if (booking.entityId) {
      await Worker.findByIdAndUpdate(booking.entityId, { availability: 'Available' });
    }

    // Notify customer
    if (booking.customer) {
      await createNotification({
        title: '🚫 Booking-gaaga Waa La Joojiyay',
        message: `Admin ayaa joojiyay booking-gaaga. Taariikh: ${booking.bookingDate}.`,
        userId: booking.customer,
        relatedId: booking._id,
        notifyAdmins: false,
      });
    }

    // Notify worker/provider
    if (booking.provider) {
      await createNotification({
        title: '🚫 Dalb Waa La Joojiyay',
        message: `Admin ayaa joojiyay dalabka macmiilka. Taariikh: ${booking.bookingDate}.`,
        userId: booking.provider,
        relatedId: booking._id,
        notifyAdmins: false,
      });
    }

    res.status(200).json({ success: true, message: 'Booking waa la joojiyay', data: booking });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a customer record (company records a customer they served)
// @route   POST /api/workers/company/customers
// @access  Private (Worker/Company owner)
exports.addCompanyCustomer = async (req, res, next) => {
  try {
    const { customerName, customerPhone, serviceProvided, date, notes, amount } = req.body;
    const worker = await Worker.findOne({ userId: req.user.id });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }

    // Store in a sub-document array on the worker (we'll use a flexible field)
    if (!worker.companyCustomers) worker.companyCustomers = [];
    worker.companyCustomers.push({
      customerName: (customerName || '').trim(),
      customerPhone: (customerPhone || '').trim(),
      serviceProvided: (serviceProvided || '').trim(),
      date: date || new Date(),
      notes: (notes || '').trim(),
      amount: Number(amount) || 0,
      addedAt: new Date(),
    });
    await worker.save();

    res.status(201).json({ success: true, data: worker.companyCustomers });
  } catch (err) {
    next(err);
  }
};

// @desc    Get company's customer records
// @route   GET /api/workers/company/customers
// @access  Private (Worker/Company owner)
exports.getCompanyCustomers = async (req, res, next) => {
  try {
    const worker = await Worker.findOne({ userId: req.user.id });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }
    res.status(200).json({ success: true, data: worker.companyCustomers || [] });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a custom service offering
// @route   POST /api/workers/company/services
// @access  Private (Worker/Company owner)
exports.addCompanyService = async (req, res, next) => {
  try {
    const { serviceName, description, price, unit } = req.body;
    if (!serviceName) {
      return res.status(400).json({ success: false, message: 'Fadlan geli magaca adeegga' });
    }
    const worker = await Worker.findOne({ userId: req.user.id });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }

    if (!worker.companyServices) worker.companyServices = [];
    worker.companyServices.push({
      serviceName: serviceName.trim(),
      description: (description || '').trim(),
      price: Number(price) || 0,
      unit: (unit || '').trim(),
      addedAt: new Date(),
    });
    await worker.save();

    res.status(201).json({ success: true, data: worker.companyServices });
  } catch (err) {
    next(err);
  }
};

// @desc    Get company's service offerings
// @route   GET /api/workers/company/services
// @access  Private (Worker/Company owner)
exports.getCompanyServices = async (req, res, next) => {
  try {
    const worker = await Worker.findOne({ userId: req.user.id });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }
    res.status(200).json({ success: true, data: worker.companyServices || [] });
  } catch (err) {
    next(err);
  }
};

// @desc    Remove a company service
// @route   DELETE /api/workers/company/services/:serviceId
// @access  Private (Worker/Company owner)
exports.removeCompanyService = async (req, res, next) => {
  try {
    const worker = await Worker.findOne({ userId: req.user.id });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }
    worker.companyServices = (worker.companyServices || []).filter(
      s => s._id.toString() !== req.params.serviceId
    );
    await worker.save();
    res.status(200).json({ success: true, data: worker.companyServices });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a worker booking (Admin hard delete)
// @route   DELETE /api/workers/bookings/:bookingId
// @access  Private (Admin)
exports.deleteWorkerBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    await booking.deleteOne();
    res.status(200).json({ success: true, message: 'Worker booking deleted successfully' });
  } catch (err) {
    next(err);
  }
};
