const Category = require('../models/Category');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    let categories = await Category.find().sort({ createdAt: -1 });
    // Seed defaults if empty
    if (categories.length === 0) {
      const defaults = [
        { name: 'Villa', icon: 'home-outline', description: 'Luxury private villas' },
        { name: 'Apartment', icon: 'business-outline', description: 'Modern city apartments' },
        { name: 'Hotel', icon: 'bed-outline', description: 'Luxury hotel rooms & suites' },
        { name: 'House', icon: 'key-outline', description: 'Family houses & residential' },
        { name: 'Land', icon: 'map-outline', description: 'Commercial & residential plots' }
      ];
      categories = await Category.insertMany(defaults);
    }
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private (Admin)
exports.createCategory = async (req, res, next) => {
  try {
    const { name, icon, description, type } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    const category = await Category.create({ name, icon, description, type });
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }
    next(err);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private (Admin)
exports.updateCategory = async (req, res, next) => {
  try {
    const { name, icon, description, type } = req.body;
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, icon, description, type },
      { new: true, runValidators: true }
    );
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private (Admin)
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
};
