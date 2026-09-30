const mongoose = require('mongoose');
const User = require('./models/User');

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/realestate');
  const user = await User.findOne({ email: 'admin@realestate.so' }).select('+password');
  console.log("User retrieved:", !!user);
  if(user) {
    console.log("Password hash starts with $2a$ or $2b$? :", user.password.startsWith('$2a$') || user.password.startsWith('$2b$'));
    console.log("Hash length:", user.password.length);
    const bcrypt = require('bcryptjs');
    const match = await bcrypt.compare('password123', user.password);
    console.log("Match password123?", match);
    if(!match) {
        // Fix it
        console.log("Fixing hash...");
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash('password123', salt);
        await user.save();
        console.log("Fixed! New hash starts with $:", user.password.startsWith('$2'));
    }
  }
  process.exit(0);
}
check();
