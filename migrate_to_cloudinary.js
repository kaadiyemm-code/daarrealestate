/**
 * MIGRATION SCRIPT: Local uploads → Cloudinary
 * 
 * Waxay samaynaysaa:
 * 1. Sawiradii local uploads/ galka ku jiray oo dhan Cloudinary ku shubtaa
 * 2. Database-ka (MongoDB) URL-yada hore ee local ah waa bedeshaa Cloudinary URL-yada cusub
 * 3. Property, Worker, User, Setting models waa la cusboonaysiin doonaa
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const cloudinary = require('./utils/cloudinary');

const Property = require('./models/Property');
const Worker = require('./models/Worker');
const User = require('./models/User');
const Setting = require('./models/Setting');

const uploadsDir = path.join(__dirname, 'uploads');

// Upload a local file to Cloudinary and return the secure URL
async function uploadToCloudinary(filePath, folder = 'realestate/migrated') {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      {
        folder,
        resource_type: filePath.endsWith('.pdf') ? 'raw' : 'image',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
  });
}

// Check if a URL is a local path
function isLocalPath(url) {
  if (!url) return false;
  return url.startsWith('/uploads/') || url.startsWith('uploads/');
}

// Get the full file path from local URL
function getFilePath(localUrl) {
  const filename = localUrl.replace('/uploads/', '').replace('uploads/', '');
  return path.join(uploadsDir, filename);
}

// Map from local URL → Cloudinary URL
const urlMap = {};

async function migrateAllLocalFiles() {
  console.log('\n📁 Sawiradii local-ka ku jiray waan la eegayaa...');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('⚠️  Galka uploads/ ma jiro. Wax migrate ah ma lahan!');
    return;
  }

  const files = fs.readdirSync(uploadsDir);
  console.log(`✅ ${files.length} faylood ayaa laga helay galka uploads/\n`);

  let uploaded = 0;
  let failed = 0;

  for (const filename of files) {
    const filePath = path.join(uploadsDir, filename);
    const localUrl = `/uploads/${filename}`;

    // Skip if already in urlMap
    if (urlMap[localUrl]) continue;

    try {
      process.stdout.write(`⬆️  Upload-ka: ${filename}...`);
      const cloudinaryUrl = await uploadToCloudinary(filePath);
      urlMap[localUrl] = cloudinaryUrl;
      uploaded++;
      console.log(` ✅`);
    } catch (err) {
      failed++;
      console.log(` ❌ Khalad: ${err.message}`);
    }
  }

  console.log(`\n📊 Upload-ka: ${uploaded} guul ah, ${failed} ku guuldareystay\n`);
}

async function updateProperties() {
  console.log('🏠 Properties-ka waan cusboonaysiinayaa...');
  const properties = await Property.find({});
  let updated = 0;

  for (const prop of properties) {
    let changed = false;

    // Update images array
    if (prop.images && prop.images.length > 0) {
      const newImages = prop.images.map(img => {
        if (isLocalPath(img) && urlMap[img]) {
          changed = true;
          return urlMap[img];
        }
        return img;
      });
      if (changed) prop.images = newImages;
    }

    if (changed) {
      await prop.save();
      updated++;
    }
  }
  console.log(`✅ ${updated} property(s) la cusboonaysiiyay\n`);
}

async function updateWorkers() {
  console.log('👷 Workers-ka waan cusboonaysiinayaa...');
  const workers = await Worker.find({});
  let updated = 0;

  for (const worker of workers) {
    let changed = false;

    // Update avatar/profileImage
    if (isLocalPath(worker.profileImage) && urlMap[worker.profileImage]) {
      worker.profileImage = urlMap[worker.profileImage];
      changed = true;
    }
    if (isLocalPath(worker.avatar) && urlMap[worker.avatar]) {
      worker.avatar = urlMap[worker.avatar];
      changed = true;
    }

    // Update portfolio/work images
    if (worker.portfolio && worker.portfolio.length > 0) {
      worker.portfolio = worker.portfolio.map(item => {
        if (isLocalPath(item.image) && urlMap[item.image]) {
          changed = true;
          return { ...item._doc, image: urlMap[item.image] };
        }
        return item;
      });
    }

    // Update documents
    if (worker.documents && worker.documents.length > 0) {
      worker.documents = worker.documents.map(doc => {
        if (isLocalPath(doc.url) && urlMap[doc.url]) {
          changed = true;
          return { ...doc._doc, url: urlMap[doc.url] };
        }
        return doc;
      });
    }

    if (changed) {
      await worker.save();
      updated++;
    }
  }
  console.log(`✅ ${updated} worker(s) la cusboonaysiiyay\n`);
}

async function updateUsers() {
  console.log('👤 Users-ka waan cusboonaysiinayaa...');
  const users = await User.find({});
  let updated = 0;

  for (const user of users) {
    let changed = false;

    if (isLocalPath(user.avatar) && urlMap[user.avatar]) {
      user.avatar = urlMap[user.avatar];
      changed = true;
    }
    if (isLocalPath(user.profileImage) && urlMap[user.profileImage]) {
      user.profileImage = urlMap[user.profileImage];
      changed = true;
    }

    if (changed) {
      await user.save();
      updated++;
    }
  }
  console.log(`✅ ${updated} user(s) la cusboonaysiiyay\n`);
}

async function updateSettings() {
  console.log('⚙️  Settings-ka waan cusboonaysiinayaa...');
  const settings = await Setting.find({});
  let updated = 0;

  for (const setting of settings) {
    let changed = false;

    if (isLocalPath(setting.splashImage) && urlMap[setting.splashImage]) {
      setting.splashImage = urlMap[setting.splashImage];
      changed = true;
    }
    if (isLocalPath(setting.logoImage) && urlMap[setting.logoImage]) {
      setting.logoImage = urlMap[setting.logoImage];
      changed = true;
    }

    if (setting.splashImages && setting.splashImages.length > 0) {
      const newSplash = setting.splashImages.map(img => {
        if (isLocalPath(img) && urlMap[img]) {
          changed = true;
          return urlMap[img];
        }
        return img;
      });
      if (changed) setting.splashImages = newSplash;
    }

    if (changed) {
      await setting.save();
      updated++;
    }
  }
  console.log(`✅ ${updated} setting(s) la cusboonaysiiyay\n`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 MIGRATION: Local Uploads → Cloudinary');
  console.log('='.repeat(60));

  // Connect to MongoDB
  console.log('\n🔌 MongoDB-ga waxaan ku xirnayaa...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB Connected!\n');

  // Step 1: Upload all local files to Cloudinary
  await migrateAllLocalFiles();

  if (Object.keys(urlMap).length === 0) {
    console.log('ℹ️  Ma jiraan sawirro local ah oo migrate la samayn karo. Waa dhammaatay!');
    await mongoose.disconnect();
    return;
  }

  console.log('📝 URL Map:');
  Object.entries(urlMap).forEach(([local, cloud]) => {
    console.log(`  ${local} → ${cloud}`);
  });
  console.log('');

  // Step 2: Update all database records
  await updateProperties();
  await updateWorkers();
  await updateUsers();
  await updateSettings();

  console.log('='.repeat(60));
  console.log('🎉 MIGRATION DHAMMAATAY! Sawiradii oo dhan Cloudinary bay ku jiraan!');
  console.log('='.repeat(60));

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Migration Error:', err);
  process.exit(1);
});
