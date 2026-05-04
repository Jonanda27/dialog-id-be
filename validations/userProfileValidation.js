import { z } from 'zod';

export const updateProfileSchema = z.object({
    username: z.string().min(3, 'Username minimal 3 karakter').optional(),
    phone_number: z.string().regex(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/g, 'Format nomor telepon tidak valid').optional(),
    gender: z.enum(['Laki-laki', 'Perempuan']).optional(),
    birth_date: z.string().optional(), // Akan divalidasi sebagai date string
});