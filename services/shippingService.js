import axios from 'axios';
import { errorHandler } from '../middlewares/errorHandler.js';

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


// File: services/shippingService.js

export const calculateRates = async (originAreaId, destinationAreaId, items) => {
    try {
        const payload = {
            origin_area_id: originAreaId,
            destination_area_id: destinationAreaId,
            couriers: 'jne,sicepat,jnt', // Kurangi list kurir untuk tes awal
            items: items.map(item => ({
                name: item.name,
                value: Number(item.price),
                weight: Number(item.weight) || 500,
                quantity: Number(item.quantity) || 1,
                length: 10, width: 10, height: 10
            }))
        };

        console.log("Kirim Payload ke Biteship:", JSON.stringify(payload, null, 2));

        const response = await biteshipClient.post('/v1/rates/couriers', payload);
        return response.data.pricing || [];

    } catch (error) {
        // --- TAMBAHKAN LOG INI ---
        if (error.response) {
            // Pesan spesifik dari Biteship (misal: "origin_area_id is invalid")
            console.error("Detail Error Biteship (400):", error.response.data);
        }
        throw error;
    }
};

export const searchAreas = async (input) => {
    try {
        const response = await biteshipClient.get('/v1/maps/areas', {
            params: {
                countries: 'ID', // Batasi pencarian hanya untuk wilayah Indonesia
                input: input,
                type: 'single'   // Parameter wajib untuk Sandbox Biteship
            }
        });

        const rawAreas = response.data.areas || [];

        // Mapping raw payload Biteship menjadi standar DTO (Data Transfer Object)
        // yang disepakati oleh interface BiteshipArea di Frontend.
        const mappedAreas = rawAreas.map(area => ({
            biteship_area_id: area.id,
            formatted_name: area.name,
            province: area.administrative_division_level_1_name,
            city: area.administrative_division_level_2_name,
            district: area.administrative_division_level_3_name,
            postal_code: area.postal_code
        }));

        return mappedAreas;
    } catch (error) {
        console.error('[Biteship Search Areas Error]:', error.response?.data || error.message);

        // Melempar error agar dapat ditangkap oleh asyncHandler di controller
        throw new Error(error.response?.data?.error || 'Gagal mencari data area pengiriman.');
    }
};