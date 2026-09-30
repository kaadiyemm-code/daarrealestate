const WorkerCategory = require('../models/WorkerCategory');

// @desc    Get all active worker categories
// @route   GET /api/worker-categories
// @access  Public
exports.getWorkerCategories = async (req, res, next) => {
  try {
    let categories = await WorkerCategory.find({ isActive: true }).sort({ name: 1 });
    if (!categories || categories.length === 0) {
      const defaults = [
        { name: 'Cleaning', nameLocal: 'Nadiifinta', icon: 'sparkles-outline', color: '#0f766e' },
        { name: 'Cooking', nameLocal: 'Karinta', icon: 'restaurant-outline', color: '#b45309' },
        { name: 'Childcare', nameLocal: 'Xannaaneyska', icon: 'happy-outline', color: '#7c3aed' },
        { name: 'Electrical', nameLocal: 'Korontada', icon: 'flash-outline', color: '#d97706' },
        { name: 'Plumbing', nameLocal: 'Tuubada', icon: 'water-outline', color: '#2563eb' },
        { name: 'Security', nameLocal: 'Ilaalinta', icon: 'shield-checkmark-outline', color: '#dc2626' },
        { name: 'Gardening', nameLocal: 'Beeraha', icon: 'leaf-outline', color: '#16a34a' },
        { name: 'Maintenance', nameLocal: 'Dayactirka', icon: 'construct-outline', color: '#0369a1' },
        { name: 'Driving', nameLocal: 'Darawelnimada', icon: 'car-outline', color: '#7e22ce' },
        { name: 'Other', nameLocal: 'Kale', icon: 'ellipsis-horizontal-outline', color: '#64748b' },
      ];
      try {
        await WorkerCategory.insertMany(defaults);
        categories = await WorkerCategory.find({ isActive: true }).sort({ name: 1 });
      } catch (seedErr) {
        console.log('Category seed error:', seedErr.message);
      }
    }
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

// @desc    Create worker category
// @route   POST /api/worker-categories
// @access  Admin
exports.createWorkerCategory = async (req, res, next) => {
  try {
    const { name, nameLocal, icon, color, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Magaca category-ga waa lagama maarmaan' });
    }
    const existing = await WorkerCategory.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category-gan hore ayuu u jiray' });
    }
    const category = await WorkerCategory.create({
      name: name.trim(),
      nameLocal: (nameLocal || '').trim(),
      icon: icon || 'briefcase-outline',
      color: color || '#0f766e',
      description: description || ''
    });
    res.status(201).json({ success: true, message: 'Category si guul leh ayaa loo daray', data: category });
  } catch (err) {
    next(err);
  }
};

// @desc    Update worker category
// @route   PUT /api/worker-categories/:id
// @access  Admin
exports.updateWorkerCategory = async (req, res, next) => {
  try {
    const { name, nameLocal, icon, color, description, isActive } = req.body;
    const oldCat = await WorkerCategory.findById(req.params.id);
    if (!oldCat) {
      return res.status(404).json({ success: false, message: 'Category lama helin' });
    }

    const updates = {};
    if (name && name.trim()) updates.name = name.trim();
    if (nameLocal !== undefined) updates.nameLocal = nameLocal.trim();
    if (icon) updates.icon = icon;
    if (color) updates.color = color;
    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.isActive = isActive;

    const category = await WorkerCategory.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

    // If name changed, update linked workers
    if (name && name.trim() !== oldCat.name) {
      try {
        const Worker = require('../models/Worker');
        await Worker.updateMany({ category: oldCat.name }, { category: name.trim() });
      } catch (wErr) {
        console.log('Worker category sync error:', wErr.message);
      }
    }

    res.status(200).json({ success: true, message: 'Category si guul leh ayaa loo cusboonaysiiyay', data: category });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete worker category
// @route   DELETE /api/worker-categories/:id
// @access  Admin
exports.deleteWorkerCategory = async (req, res, next) => {
  try {
    const category = await WorkerCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category lama helin' });
    res.status(200).json({ success: true, message: 'Category-ga waa la tirtiray' });
  } catch (err) {
    next(err);
  }
};

// @desc    Seed default categories
// @route   POST /api/worker-categories/seed
// @access  Admin
exports.seedDefaultCategories = async (req, res, next) => {
  try {
    const defaults = [
      { name: 'Cleaning', nameLocal: 'Nadiifinta', icon: 'sparkles-outline', color: '#0f766e' },
      { name: 'Cooking', nameLocal: 'Karinta', icon: 'restaurant-outline', color: '#b45309' },
      { name: 'Childcare', nameLocal: 'Xannaaneyska', icon: 'happy-outline', color: '#7c3aed' },
      { name: 'Electrical', nameLocal: 'Korontada', icon: 'flash-outline', color: '#d97706' },
      { name: 'Plumbing', nameLocal: 'Tuubada', icon: 'water-outline', color: '#2563eb' },
      { name: 'Security', nameLocal: 'Ilaalinta', icon: 'shield-checkmark-outline', color: '#dc2626' },
      { name: 'Gardening', nameLocal: 'Beeraha', icon: 'leaf-outline', color: '#16a34a' },
      { name: 'Maintenance', nameLocal: 'Dayactirka', icon: 'construct-outline', color: '#0369a1' },
      { name: 'Driving', nameLocal: 'Darawelnimada', icon: 'car-outline', color: '#7e22ce' },
      { name: 'Other', nameLocal: 'Kale', icon: 'ellipsis-horizontal-outline', color: '#64748b' },
    ];

    const created = [];
    for (const cat of defaults) {
      const exists = await WorkerCategory.findOne({ name: cat.name });
      if (!exists) {
        const newCat = await WorkerCategory.create(cat);
        created.push(newCat);
      }
    }
    res.status(200).json({ success: true, message: `${created.length} categories seeded`, data: created });
  } catch (err) {
    next(err);
  }
};
