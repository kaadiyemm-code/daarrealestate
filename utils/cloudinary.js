const path = require('path');
const dotenv = require('dotenv');

// Ensure dotenv is loaded even if called before app setup
dotenv.config({ path: path.join(__dirname, '../.env') });

const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dt6l73e7m',
  api_key: process.env.CLOUDINARY_API_KEY || '114588449263911',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'a1SBWqf2n7v2KNGAF3ANzr29VPk',
});

module.exports = cloudinary;
