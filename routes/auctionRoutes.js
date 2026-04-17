import express from 'express';
import {
    createAuction,
    getAuctionsByStore,
    cancelAuction
} from '../controllers/auctionController.js';

// Asumsi middleware autentikasi eksisting di repository Anda
import { protect } from '../middlewares/auth.js';
import { isSeller } from '../middlewares/store.js'; // Jika ada middleware spesifik role

const router = express.Router();

// Semua rute lelang untuk Seller wajib melewati Autentikasi
router.use(protect);

// Jika ada pengecekan Role Seller
if (isSeller) {
    router.use(isSeller);
}

// Endpoint CRUD Jadwal Lelang
router.post('/', createAuction);
router.get('/store', getAuctionsByStore);
router.put('/:id/cancel', cancelAuction);

// Endpoint tambahan di masa depan (misal: mengambil detail 1 lelang spesifik)
// router.get('/:id', getAuctionDetail);

export default router;