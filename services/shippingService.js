import axios from 'axios';
import { AppError } from '../middlewares/errorHandler.js';

const biteshipClient = axios.create({
    baseURL: process.env.BITESHIP_BASE_URL,
    headers: {
        'Authorization': `Bearer ${process.env.BITESHIP_API_KEY}`,
        'Content-Type': 'application/json'
    },
    timeout: 8000
});

// Kurir yang diaktifkan secara default (bisa dipindah ke konfigurasi DB di masa depan)
const ALLOWED_COURIERS = ['jne', 'sicepat', 'jnt', 'gojek', 'grab'];

export const calculateRates = async (originAreaId, destinationAreaId, items) => {
    try {
        // Memformat payload items sesuai standar Biteship
        const formattedItems = items.map(item => ({
            name: item.name,
            description: item.description || '',
            value: item.price,
            length: item.length || 10,
            width: item.width || 10,
            height: item.height || 10,
            weight: item.weight || 1000,
            quantity: item.quantity
        }));

        const payload = {
            origin_area_id: originAreaId,
            destination_area_id: destinationAreaId,
            couriers: ALLOWED_COURIERS.join(','),
            items: formattedItems
        };

        const response = await biteshipClient.post('/v1/rates/couriers', payload);

        // Mapping respon menjadi struktur yang bersih untuk Frontend
        const rawRates = response.data.pricing || [];

        return rawRates.map(rate => ({
            courier_company: rate.company,
            courier_name: rate.courier_name,
            service_type: rate.type,
            service_name: rate.service_name,
            price: rate.price,
            duration: rate.duration,
            estimated_delivery: rate.duration // Biasa direpresentasikan dalam string misal "1 - 2 days"
        }));

    } catch (error) {
        console.error('[Biteship Rates Error]:', error.response?.data || error.message);
        throw new AppError(
            error.response?.data?.error || 'Gagal menghitung tarif pengiriman.',
            error.response?.status || 500
        );
    }
};