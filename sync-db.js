require('dotenv').config();
const db = require('./server/models');

async function sync() {
    try {
        console.log('⏳ Sedang menghubungkan ke database TiDB...');
        await db.sequelize.authenticate();
        console.log('✅ Koneksi Berhasil!');

        console.log('⏳ Sedang membuat tabel (Users & Reports)...');
        // alter: true akan menyesuaikan struktur tabel jika sudah ada perubahan, 
        // atau membuat baru jika belum ada.
        await db.sequelize.sync({ alter: true });

        console.log('✅ SUKSES: Semua tabel berhasil dibuat!');
        process.exit(0);
    } catch (err) {
        console.error('❌ GAGAL:', err);
        process.exit(1);
    }
}

sync();
