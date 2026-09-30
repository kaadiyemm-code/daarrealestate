require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const Category = require('./models/Category');
    const workerCats = ['Cleaning', 'Cooking', 'Childcare', 'Electrical', 'Plumbing', 'Security', 'Gardening', 'Maintenance', 'Driving', 'Other', 'Nadiifinta', 'Karinta', 'Tuubada', 'Korontada', 'Ilaalinta', 'Beeraha', 'Dayactirka', 'Darawelnimada', 'Kale', 'Tuubiste', 'Worker', 'Shaqaale', 'Hsjs', 'Turjuma', 'Turjumaan'];
    
    const result = await Category.deleteMany({ name: { $in: workerCats } });
    console.log(`Deleted ${result.deletedCount} fake property categories`);
    
    const cats = await Category.find();
    console.log('Remaining categories:', cats.map(c => c.name));
    
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
