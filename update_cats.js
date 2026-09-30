const mongoose = require('mongoose');
const Category = require('./models/Category');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/realestate').then(async () => {
  const workerCats = ['Cleaning', 'Cooking', 'Childcare', 'Electrical', 'Plumbing', 'Security', 'Gardening', 'Maintenance', 'Driving', 'Other', 'Nadiifinta', 'Karinta', 'Tuubada', 'Korontada', 'Ilaalinta', 'Beeraha', 'Dayactirka', 'Darawelnimada', 'Kale', 'Tuubiste', 'Worker', 'Shaqaale'];
  const res = await Category.updateMany({ name: { $in: workerCats } }, { $set: { type: 'Worker' } });
  console.log('Updated', res.modifiedCount, 'categories');
  process.exit(0);
}).catch(console.error);
