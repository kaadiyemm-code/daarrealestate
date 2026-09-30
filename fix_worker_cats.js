require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const WorkerCategory = require('./models/WorkerCategory');
    const result = await WorkerCategory.deleteMany({});
    console.log(`Deleted all ${result.deletedCount} worker categories.`);
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
