import express from 'express';
import { 
  getHistory, 
  getChatList, 
  getPenjualChatList 
} from '../controllers/chatController.js';
import { authenticate } from '../middlewares/auth.js';
import { uploadMedia } from '../utils/cloudinary.js'; // Import middleware baru

const router = express.Router();

// Middleware autentikasi wajib untuk semua rute chat
router.use(authenticate);

/**
 * @route   POST /api/chat/upload
 * @desc    Upload gambar atau video ke Cloudinary sebelum dikirim via Socket
 */
router.post('/upload', uploadMedia.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tidak ada file yang diunggah' 
      });
    }

    // Mengembalikan data file yang sudah tersimpan di Cloudinary
    return res.status(200).json({
      success: true,
      data: {
        url: req.file.path, // URL permanen Cloudinary
        message_type: req.file.mimetype.startsWith('video') ? 'video' : 'image',
        file_name: req.file.originalname
      }
    });
  } catch (error) {
    console.error("Error upload chat media:", error);
    return res.status(500).json({ 
      success: false, 
      message: 'Gagal mengunggah media' 
    });
  }
});

// Mengambil riwayat pesan spesifik toko
router.get('/history/:storeId', getHistory);

// Mengambil daftar toko yang aktif di chat (sidebar)
router.get('/list', getChatList);

// Mengambil daftar chat untuk sisi penjual
router.get('/penjual/list', getPenjualChatList);

export default router;