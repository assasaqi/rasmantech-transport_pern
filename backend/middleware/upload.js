const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const supabase = require('../config/supabase');

// Nama Bucket resmi di Supabase Storage
const BUCKET_NAME = 'rasman_travel';

// 1. Gunakan memoryStorage agar gambar ditampung di RAM saat proses kompresi & upload
const storage = multer.memoryStorage();

// Validasi Ganda: Memeriksa MIME Type dan Ekstensi Berkas
const fileFilter = (req, file, cb) => {
    const allowedExts = /\.(jpg|jpeg|png|webp)$/i;
    const isExtensionValid = allowedExts.test(file.originalname);
    const isMimeValid = file.mimetype.startsWith('image/');

    if (isMimeValid && isExtensionValid) {
        cb(null, true);
    } else {
        cb(new Error('Hanya berkas gambar (JPG, JPEG, PNG, WEBP) yang diperbolehkan!'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Batas maksimum 5MB per berkas
});

// Helper internal: Kompresi gambar via Sharp -> Unggah Buffer WebP ke Supabase Storage
const processAndUploadToSupabase = async (fileBuffer) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `file-${uniqueSuffix}.webp`;

    // 1. Kompresi gambar di memori (RAM) menjadi WebP
    const compressedBuffer = await sharp(fileBuffer)
        .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

    // 2. Unggah buffer langsung ke Supabase Storage (Bucket 'rasman_travel')
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filename, compressedBuffer, {
            contentType: 'image/webp',
            upsert: true
        });

    if (error) {
        throw new Error(`Gagal mengunggah gambar ke Supabase Storage: ${error.message}`);
    }

    // 3. Dapatkan Public URL resmi dari Supabase
    const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filename);

    const publicUrl = publicUrlData.publicUrl;

    return {
        filename,
        publicUrl,
        relativePath: `/uploads/${filename}`
    };
};

// Middleware pemrosesan gambar ke format WebP & Upload ke Supabase Storage
const compressImage = async (req, res, next) => {
    try {
        // 1. Penanganan Single File (req.file)
        if (req.file) {
            const processed = await processAndUploadToSupabase(req.file.buffer);
            req.file.filename = processed.filename;
            req.file.path = processed.publicUrl; // Public URL Supabase
            req.file.location = processed.publicUrl;
            return next();
        }

        // 2. Penanganan Multiple Files (req.files)
        if (req.files) {
            if (Array.isArray(req.files)) {
                await Promise.all(
                    req.files.map(async (file) => {
                        const processed = await processAndUploadToSupabase(file.buffer);
                        file.filename = processed.filename;
                        file.path = processed.publicUrl;
                        file.location = processed.publicUrl;
                    })
                );
            } else if (typeof req.files === 'object') {
                const filePromises = [];
                for (const fieldname of Object.keys(req.files)) {
                    for (const file of req.files[fieldname]) {
                        filePromises.push(
                            (async () => {
                                const processed = await processAndUploadToSupabase(file.buffer);
                                file.filename = processed.filename;
                                file.path = processed.publicUrl;
                                file.location = processed.publicUrl;
                            })()
                        );
                    }
                }
                await Promise.all(filePromises);
            }
            return next();
        }

        next();
    } catch (error) {
        next(error);
    }
};

// Helper Function: Menghapus File Gambar Langsung dari Supabase Storage (Non-blocking)
const deleteImageFile = async (imageUrl) => {
    if (!imageUrl || typeof imageUrl !== 'string') return;

    try {
        // Ambil nama berkas saja dari URL/Path
        let filename = imageUrl.split('/').pop();
        if (filename && filename.includes('?')) {
            filename = filename.split('?')[0];
        }

        if (filename) {
            const { error } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([filename]);

            if (error) {
                console.warn(`[Supabase Storage Warning] Gagal menghapus ${filename}:`, error.message);
            }
        }
    } catch (err) {
        console.error('[deleteImageFile Error]:', err.message);
    }
};

module.exports = {
    upload,
    compressImage,
    deleteImageFile
};
