require('dotenv').config();
const db = require('./server/models');
const bcrypt = require('bcrypt');

async function createAdmin() {
    try {
        console.log('⏳ Sedang menghubungkan ke database...');

        // Cek apakah admin sudah ada
        const existingAdmin = await db.User.findOne({ where: { email: 'admin@laporjalan.com' } });
        if (existingAdmin) {
            console.log('⚠️  Admin sudah ada: admin@laporjalan.com');
            console.log('    Password tidak diubah.');
            process.exit(0);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Buat user admin
        await db.User.create({
            nama: 'Administrator Utama',
            email: 'admin@laporjalan.com',
            password: hashedPassword,
            role: 'admin'
        });

        console.log('✅ SUKSES! Akun Admin berhasil dibuat.');
        console.log('-------------------------------------------');
        console.log('📧 Email    : admin@laporjalan.com');
        console.log('🔑 Password : admin123');
        console.log('-------------------------------------------');
        console.log('Silakan login di halaman web.');

        process.exit(0);

    } catch (err) {
        console.error('❌ GAGAL:', err);
        process.exit(1);
    }
}

createAdmin();
