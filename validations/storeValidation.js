import { z } from 'zod';

export const registerStoreSchema = z.object({
    body: z.object({
        name: z.string().min(3, 'Nama toko minimal 3 karakter'),
        description: z.string().optional(),
    })
});