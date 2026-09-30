const User = require('../models/User');

const mongoose = require('mongoose');

exports.getUsers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } }
      ];
      if (mongoose.Types.ObjectId.isValid(search)) {
        query.$or.push({ _id: search });
      }
    }
    const users = await User.find(query).select('-password');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createUserAdmin = async (req, res) => {
  try {
    let { name, email, phone, password, role, companyName } = req.body;
    
    if (email) email = email.toLowerCase().trim();
    if (phone) phone = phone.trim();
    
    const identifier = email || phone;
    
    if (!name || !identifier || !password) {
      return res.status(400).json({ success: false, message: 'Magaca, (Email ama Phone) iyo Password waa khasab.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password-ku waa inuu ka koobnaadaa ugu yaraan 6 xaraf/tiro.' });
    }

    // Check uniqueness only on fields actually provided
    const orConditions = [];
    if (email) orConditions.push({ email });
    if (phone) orConditions.push({ phone });

    if (orConditions.length > 0) {
      const existingUser = await User.findOne({ $or: orConditions });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: existingUser.email === email
            ? 'Email-kan hore ayaa loo isticmaalay'
            : 'Telefoon-kan hore ayaa loo isticmaalay'
        });
      }
    }

    const assignedRole = role === 'Agent' ? 'Agency' : (role || 'Customer');
    const userData = {
      name: name.trim(),
      password,
      role: assignedRole,
      isApproved: true,
      isActive: true
    };
    if (email) userData.email = email;
    if (phone) userData.phone = phone;

    if (assignedRole === 'Agency') {
      userData.agencyProfile = {
        companyName: companyName || name.trim(),
        isRegistered: true
      };
    }

    const user = await User.create(userData);
    const userWithoutPassword = await User.findById(user._id).select('-password');
    res.status(201).json({ success: true, data: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.updateUserAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (req.body.name) user.name = req.body.name.trim();
    if (req.body.email) {
      const newEmail = req.body.email.toLowerCase().trim();
      const existing = await User.findOne({ email: newEmail, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email-kan qof kale ayaa leh' });
      }
      user.email = newEmail;
    }
    if (req.body.phone !== undefined) {
      const newPhone = req.body.phone ? req.body.phone.trim() : null;
      if (newPhone) {
        const existing = await User.findOne({ phone: newPhone, _id: { $ne: user._id } });
        if (existing) {
          return res.status(400).json({ success: false, message: 'Telefoon-kan qof kale ayaa leh' });
        }
        user.phone = newPhone;
      }
    }
    if (req.body.role) {
      const newRole = req.body.role === 'Agent' ? 'Agency' : req.body.role;
      user.role = newRole;
      if (newRole === 'Agency' && !user.agencyProfile?.isRegistered) {
        user.agencyProfile = {
          companyName: req.body.companyName || user.name,
          isRegistered: true
        };
      }
    }
    if (req.body.password && req.body.password.trim().length >= 6) {
      user.password = req.body.password.trim();
    }
    if (req.body.isApproved !== undefined) user.isApproved = req.body.isApproved;
    if (req.body.isActive !== undefined) user.isActive = req.body.isActive;

    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['Admin', 'Agent', 'Customer', 'Worker', 'Company', 'Agency'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const updates = { role };
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    try {
      const Worker = require('../models/Worker');
      await Worker.deleteMany({ userId: req.params.id });
    } catch (e) {
      console.log('Worker cleanup error on user delete:', e.message);
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.toggleSavedProperty = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const propertyId = req.params.propertyId;

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.savedProperties) user.savedProperties = [];

    const isSaved = user.savedProperties.some(id => id.toString() === propertyId.toString());
    
    if (isSaved) {
      user.savedProperties = user.savedProperties.filter(id => id.toString() !== propertyId.toString());
    } else {
      user.savedProperties.push(propertyId);
    }
    
    await user.save();
    res.json({ success: true, isSaved: !isSaved, savedProperties: user.savedProperties });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.toggleSavedWorker = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const workerId = req.params.workerId;

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.savedWorkers) user.savedWorkers = [];

    const isSaved = user.savedWorkers.some(id => id.toString() === workerId.toString());
    
    if (isSaved) {
      user.savedWorkers = user.savedWorkers.filter(id => id.toString() !== workerId.toString());
    } else {
      user.savedWorkers.push(workerId);
    }
    
    await user.save();
    res.json({ success: true, isSaved: !isSaved, savedWorkers: user.savedWorkers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    // A non-admin user can only edit their own profile
    if (req.user.role !== 'Admin' && req.params.id && req.user.id.toString() !== req.params.id.toString()) {
      return res.status(403).json({ success: false, message: 'Ma awoodid inaad wax ka beddesho akoon qof kale' });
    }

    const userId = req.user.role === 'Admin' && req.params.id ? req.params.id : req.user.id;
    const user = await User.findById(userId).select('+password');

    if (user) {
      // Role can never be changed via updateProfile by non-admins
      if (req.user.role === 'Admin' && req.body.role) {
        user.role = req.body.role;
      }
      let criticalUpdate = false;
      
      if (req.body.name && req.body.name !== user.name) {
        user.name = req.body.name;
        criticalUpdate = true;
      }
      if (req.body.email && req.body.email.toLowerCase().trim() !== user.email) {
        user.email = req.body.email.toLowerCase().trim();
        criticalUpdate = true;
      }
      if (req.body.phone !== undefined && req.body.phone.trim() !== user.phone) {
        user.phone = req.body.phone.trim();
        criticalUpdate = true;
      }
      
      if (req.body.avatar !== undefined) {
        user.avatar = req.body.avatar;
      }

      // If Agency, Company, or Worker updates critical info, require re-approval
      if (criticalUpdate && req.user.role !== 'Admin' && ['Agency', 'Company', 'Worker'].includes(user.role)) {
        user.isApproved = false;
      }

      if (req.body.password && req.body.password.trim().length >= 6) {
        if (req.user.role !== 'Admin') {
          if (!req.body.oldPassword) {
            return res.status(400).json({ success: false, message: 'Fadlan gali password-kii hore si aad u beddesho.' });
          }
          const isMatch = await user.matchPassword(req.body.oldPassword);
          if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Password-kii hore waa khalad.' });
          }
        }
        user.password = req.body.password; // Mongoose middleware will hash it
      }

      const updatedUser = await user.save();

      res.json({
        success: true,
        data: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          avatar: updatedUser.avatar,
          role: updatedUser.role,
          savedProperties: updatedUser.savedProperties,
          agencyProfile: updatedUser.agencyProfile
        },
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Profile update controller error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.registerAgency = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.agencyProfile && user.agencyProfile.isRegistered) {
      return res.status(400).json({ 
        success: false, 
        message: 'Hore ayaad isku diiwaangelisay. Bartaada (Profile) wax ka bedel (Edit Profile).',
        alreadyRegistered: true
      });
    }

    const { companyName, description, address, businessLicense } = req.body;

    user.role = 'Agency';
    user.isApproved = false; // Requires Admin approval
    user.agencyProfile = {
      companyName,
      description,
      address,
      businessLicense,
      isRegistered: true
    };

    await user.save();

    res.status(200).json({ success: true, data: user, message: 'Waa lagu diiwaangeliyay!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isApproved = req.body.isApproved;
    await user.save();
    
    res.json({ success: true, data: user, message: user.isApproved ? 'User approved successfully' : 'User unapproved' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
