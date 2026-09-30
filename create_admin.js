const mongoose = require('mongoose');
const User = require('./models/User');

require('dotenv').config();
async function createSimpleAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash('123456', salt);
  
  let user = await User.findOne({ email: 'admin@admin.com' });
  if (!user) {
    user = await User.create({
      name: 'Super Admin',
      email: 'admin@admin.com',
      password: password,
      role: 'Admin'
    });
    console.log("Created simple admin: admin@admin.com / 123456");
  } else {
    user.password = password;
    await user.save();
    console.log("Updated simple admin: admin@admin.com / 123456");
  }
  process.exit(0);
}
createSimpleAdmin();
