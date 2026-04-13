/**
 * Shipping Service
 * Bertanggung jawab menangani integrasi dengan pihak ke-3 (RajaOngkir/Biteship).
 * Terisolasi dari OrderService agar pembuatan pesanan utama tidak ikut terganggu
 * jika API logistik sedang down.
 */

export const calculateShippingCost = async (origin, destination, weight) => {
    // Validasi dasar
    if (!origin || !destination || !weight) {
        const error = new Error('Origin, destination, dan weight wajib diisi untuk kalkulasi ongkir.');
        error.statusCode = 400;
        throw error;
    }

    try {
        // TODO: Ganti blok ini dengan HTTP Request asli menggunakan Axios ke vendor logistik (RajaOngkir/Biteship)
        // const response = await axios.post('https://api.rajaongkir.com/starter/cost', { ... });

        // --- MOCK RESPONSE (Meniru struktur data vendor logistik) ---
        // Asumsi kalkulasi dinamis berdasarkan berat (weight dalam gram)
        const baseCost = 10000;
        const weightMultiplier = Math.ceil(weight / 1000); // Pembulatan ke atas per KG

        const availableCouriers = [
            {
                courier_code: 'jne',
                courier_name: 'JNE (Jalur Nugraha Ekakurir)',
                service_type: 'REG',
                service_name: 'Layanan Reguler',
                cost: baseCost * weightMultiplier,
                etd: '2-3 Hari' // Estimated Time of Delivery
            },
            {
                courier_code: 'jne',
                courier_name: 'JNE (Jalur Nugraha Ekakurir)',
                service_type: 'YES',
                service_name: 'Yakin Esok Sampai',
                cost: (baseCost + 8000) * weightMultiplier,
                etd: '1 Hari'
            },
            {
                courier_code: 'sicepat',
                courier_name: 'SiCepat Ekspres',
                service_type: 'HALU',
                service_name: 'Harga Mulai Lima Ribu',
                cost: (baseCost - 2000) * weightMultiplier,
                etd: '3-5 Hari'
            }
        ];

        // Simulasi delay jaringan (Network latency simulation)
        await new Promise(resolve => setTimeout(resolve, 300));

        return availableCouriers;
    } catch (error) {
        // Log error ke sistem internal (Sentry/Datadog) agar tidak bocor ke user
        console.error('[ShippingService Error]:', error.message);

        const customError = new Error('Gagal terhubung dengan penyedia layanan logistik. Silakan coba lagi.');
        customError.statusCode = 503; // Service Unavailable
        throw customError;
    }
};

const ShippingService = {
    calculateShippingCost
};

export default ShippingService;