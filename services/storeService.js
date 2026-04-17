// File: dialog-id-be/services/storeService.js
import db from "../models/index.js";
import Store from "../models/Store.js";
import { Op } from 'sequelize';

class StoreService {
  /**
   * Mendaftarkan toko baru untuk user.
   * Menggunakan validasi one-to-one dan unique constraint.
   */
  static async createStore(userId, storeData) {
    const { name, description } = storeData;

    // 1. Validasi One-to-One: Pastikan user belum punya toko
    const existingStore = await db.Store.findOne({
      where: { user_id: userId },
    });
    if (existingStore) {
      const error = new Error(
        "User ini sudah memiliki toko. Satu akun hanya diperbolehkan memiliki satu toko.",
      );
      error.statusCode = 409; // Conflict
      throw error;
    }

    // 2. Validasi Unique Name: Pastikan nama toko belum dipakai orang lain
    const nameTaken = await db.Store.findOne({ where: { name } });
    if (nameTaken) {
      const error = new Error(
        "Nama toko sudah digunakan. Silakan pilih nama lain.",
      );
      error.statusCode = 409;
      throw error;
    }

    // 3. Buat toko dengan status pending
    const newStore = await db.Store.create({
      user_id: userId,
      name,
      description,
      status: "pending", // Default status sesuai aturan bisnis
    });

    return newStore;
  }

  /**
   * Memperbarui dokumen KYC (KTP) toko.
   */
  static async uploadKYC(storeId, ktpUrl) {
    const store = await db.Store.findByPk(storeId);
    if (!store) {
      const error = new Error("Toko tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }

    // Konsistensi Path: Menghilangkan '/public' jika di-pass dari Multer
    store.ktp_url = ktpUrl.replace("/public", "");
    await store.save();

    return store;
  }

  static async getByUserId(userId) {
    return await Store.findOne({ where: { user_id: userId } });
  }

  /**
   * Mengambil profil toko berdasarkan ID User.
   */
  static async getStoreByUserId(userId) {
    return await db.Store.findOne({ where: { user_id: userId } });
  }

  /**
   * Mengambil saldo aktif toko beserta riwayat mutasi finansialnya.
   * Memisahkan query Balance dan Transactions demi performa baca yang optimal.
   */
  static async getStoreWallet(storeId) {
    // 1. Ambil data saldo utama secara real-time
    const store = await db.Store.findByPk(storeId, {
      attributes: ["id", "balance"],
    });

    if (!store) {
      const error = new Error("Toko tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }

    // 2. Ambil riwayat mutasi (Wallet Transactions)
    const transactions = await db.WalletTransaction.findAll({
      where: { store_id: storeId },
      order: [["created_at", "DESC"]],
    });

    return {
      balance: store.balance,
      transactions: transactions,
    };
  }

  static async updateStoreService(userId, updateData, files = {}) {
    const store = await this.getByUserId(userId);
    if (!store) throw new Error("Toko tidak ditemukan");

    const updatedFields = {
      name: updateData.name,
      description: updateData.description,
      working_days: updateData.working_days,
      working_hours: updateData.working_hours,
      social_links: {
        instagram: updateData.instagram || store.social_links?.instagram || "",
        facebook: updateData.facebook || store.social_links?.facebook || "",
        youtube: updateData.youtube || store.social_links?.youtube || "",
        website: updateData.website || store.social_links?.website || "",
      },
    };

    // Logika simpan path Banner
    if (files["banner_file"]) {
      updatedFields.banner_url = `/uploads/banner/${files["banner_file"][0].filename}`;
    } else if (typeof updateData.banner_url === "string") {
      updatedFields.banner_url = updateData.banner_url;
    }

    // Logika simpan path Logo
    if (files["logo_file"]) {
      updatedFields.logo_url = `/uploads/logo/${files["logo_file"][0].filename}`;
    } else if (typeof updateData.logo_url === "string") {
      updatedFields.logo_url = updateData.logo_url;
    }

    return await store.update(updatedFields);
  }

  /**
 * Mengambil semua data toko dengan filter opsional
 */
static async findAllStores(filters) {
    const { status, search } = filters;
    

    const whereClause = {};
    
    // Filter berdasarkan status toko
    if (status) {
        whereClause.status = status;
    }

    // Filter berdasarkan nama toko (pencarian)
    if (search) {
        whereClause.name = {
            [Op.iLike]: `%${search}%` // Case-insensitive search untuk PostgreSQL
        };
    }

    return await db.Store.findAll({
        where: whereClause,
        attributes: [
            'id', 
            'name', 
            'description', 
            'logo_url', 
            'banner_url', 
            'status', 
            'working_days', 
            'working_hours', 
            'createdAt'
        ],
        // Kita juga bisa menyertakan jumlah produk yang dimiliki toko tersebut
        include: [
            {
                model: db.Product,
                as: 'products',
                attributes: ['id']
            }
        ],
        order: [['createdAt', 'DESC']]
    });
}
static async findById(id) {
    return await db.Store.findByPk(id, {
        attributes: [
            'id', 'name', 'description', 'logo_url', 'banner_url', 
            'status', 'working_days', 'working_hours', 'social_links',
            'created_at' 
        ],
        include: [
            {
                model: db.User,
                as: 'owner',
                // Coba tulis atribut secara eksplisit dalam nested array jika name bermasalah
                attributes: ['full_name'], 
            }
        ]
    });
}

/**
   * Menambahkan informasi rekening bank untuk pertama kali (Create)
   */
  static async createBankInfo(userId, bankData) {
    const store = await this.getByUserId(userId);
    
    if (!store) {
      const error = new Error("Toko tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }

    // Validasi: Pastikan bank belum pernah dibuat
    // Jika bank_account_number sudah ada isinya, tolak operasi "Create"
    if (store.bank_account_number) {
      const error = new Error("Informasi rekening bank sudah terdaftar. Silakan gunakan fitur Update jika ingin mengubahnya.");
      error.statusCode = 409; // 409 Conflict
      throw error;
    }

    // Simpan data bank baru ke dalam tabel stores
    return await store.update({
      bank_name: bankData.bank_name,
      bank_account_number: bankData.bank_account_number,
      bank_account_name: bankData.bank_account_name,
    });
  }

}



export default StoreService;
