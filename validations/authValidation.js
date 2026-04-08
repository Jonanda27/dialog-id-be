import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        email: z.string().email('Format email tidak valid'),
        password: z.string().min(8, 'Password minimal harus 8 karakter'),
        full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
        role: z.enum(['buyer', 'seller'], {
            errorMap: () => ({ message: 'Role harus berupa buyer atau seller' })
        })
        // Catatan: Role 'admin' tidak bisa diregister secara publik demi keamanan
    })
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Format email tidak valid'),
        password: z.string().min(1, 'Password wajib diisi')
    })
});

/**
 * Middleware untuk memvalidasi request body/query/params menggunakan Zod
 */
export const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            // Akan ditangkap oleh Global Error Handler di app.js
            next(error);
        }
    };
};