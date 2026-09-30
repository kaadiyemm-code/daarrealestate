const mongoose = require('mongoose');
const User = require('./models/User');

async function fixRole() {
  await mongoose.connect('mongodb://127.0.0.1:27017/realestate');
  await User.updateOne({ email: 'admin@admin.com' }, { $set: { role: 'Admin' } });
  console.log("Fixed role to Admin for admin@admin.com");
  process.exit(0);
}
fixRole();
