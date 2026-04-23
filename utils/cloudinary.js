// File: dialog-id-be/utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // ⚡ PERBAIKAN: Penentuan folder Cloudinary dinamis berdasarkan URL request
    let folderName = 'analog_media';
    if (req.originalUrl.includes('chat')) folderName = 'analog_chat';
    if (req.originalUrl.includes('disputes')) folderName = 'analog_disputes';

    return {
      folder: folderName,
      resource_type: 'auto', // Mendeteksi image/video secara otomatis
      allowed_formats: ['jpg', 'png', 'jpeg', 'mp4', 'mov'],
    };
  },
});

const uploadMedia = multer({ storage: storage });

export { uploadMedia, cloudinary };