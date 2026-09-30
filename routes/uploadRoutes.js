const express = require('express');
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Use memory storage so we can upload buffer directly to Cloudinary without writing to disk
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Keliya sawirro ama PDF ayaa la oggol yahay (Only images or PDFs allowed)'), false);
    }
  }
});

// Helper function to upload buffer to Cloudinary
const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'realestate_app',
        resource_type: 'auto',
        ...options,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

// @desc    Universal file/image upload to Cloudinary
// @route   POST /api/upload
// @access  Public / Protected (supports both)
router.post(
  '/',
  upload.any(),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Fadlan dooro ugu yaraan hal sawir (No files uploaded)'
        });
      }

      const folder = req.query.folder || req.body.folder || 'realestate_app';

      const uploadPromises = req.files.map(file =>
        uploadBufferToCloudinary(file.buffer, {
          folder: `realestate/${folder}`,
          resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
        })
      );

      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.secure_url);

      console.log(`[Cloudinary Upload] Successfully uploaded ${urls.length} file(s) to folder: realestate/${folder}`);

      res.status(200).json({
        success: true,
        urls,
        url: urls[0],
        data: urls,
      });
    } catch (err) {
      console.error('[Cloudinary Upload Error]:', err.message);
      res.status(500).json({
        success: false,
        message: 'Sawirka lama gelin karo Cloudinary: ' + err.message,
      });
    }
  }
);

module.exports = router;
