import { z } from 'zod';

export const addressSchema = z.object({
    label: z.string().min(1, 'Label alamat wajib diisi (misal: Rumah, Kantor)'),
    recipient_name: z.string().min(1, 'Nama penerima wajib diisi'),
    phone_number: z.string().regex(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/g, 'Format nomor telepon tidak valid'),
    address_detail: z.string().min(5, 'Detail alamat terlalu pendek'),
    province: z.string().min(1, 'Provinsi wajib diisi'),
    city: z.string().min(1, 'Kota/Kabupaten wajib diisi'),
    district: z.string().min(1, 'Kecamatan wajib diisi'),
    postal_code: z.string().min(1, 'Kode pos wajib diisi'),
    biteship_area_id: z.string().min(1, 'Biteship Area ID wajib disertakan'),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    is_primary: z.boolean().optional().default(false)
});