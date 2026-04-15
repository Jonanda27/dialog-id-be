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
// validations/authValidation.js

export const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            // LOG UNTUK DEBUG (Hapus kalau sudah jalan)
            console.log("DATA MASUK KE VALIDATOR:", req.body);
            // Kita validasi langsung req.body, req.query, dan req.params secara terpisah
            // Jika skema punya properti 'body', 'query', atau 'params', dia akan validasi itu.
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            // Log error biar kita tahu persis apa yang salah
            console.error("[ZOD ERROR]:", JSON.stringify(error.errors, null, 2));
            next(error);
        }
    };
};

export const validateRequestOrder = (schema) => {
    return (req, res, next) => {
        try {
            // LANGSUNG tembak ke req.body. 
            // Gak usah pake { body: req.body, query: ... } karena itu yang bikin lo pusing dari tadi.
            schema.parse(req.body);
            next();
        } catch (error) {
            console.error("ZOD NYEBELIN:", error.errors);
            next(error);
        }
    };
};