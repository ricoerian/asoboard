# Kebijakan Privasi Asoboard

## 1. Pendahuluan
Asoboard - A Fun Learning Platform ("Asoboard") adalah layanan edukasi interaktif yang menawarkan pengalaman pembelajaran berbasis whiteboard kolaboratif. Kebijakan ini menjelaskan bagaimana kami mengelola data pribadi pengguna sesuai dengan peraturan perundang-undangan Indonesia, khususnya **PP No. 40 Tahun 2021** tentang Perlindungan Data Pribadi dan **UU ITE** tentang Transaksi Electronic.

## 2. Definisi
- **Data Pribadi**: Informasi yang dapat mengidentifikasi seseorang, seperti nama, email, nomor telepon, foto, dan aktivitas interaksi.  
- **Data Sensitif**: Informasi yang membutuhkan perlindungan khusus, misalnya data kesehatan atau data genetik (tidak ada dalam Asoboard).

## 3. Jenis Data yang Kami Kumpulkan
- **Data Akun**: Nama pengguna, email, nomor telepon, foto profil, peran (mentor/student), kata sandi (terenkripsi).  
- **Data Interaksi**: Aktivitas di whiteboard (gambar, teks, alat), sesi yang dicatat, pencapaian game, skor, dan diary.  
- **Data Teknis**: IP address, browser, versi perangkat, waktu akses, log aktivitas.  
- **Data Media**: File audio/video yang diunggah untuk rekaman sesi, serta gambar atau file lain yang di‑upload sebagai asset.

## 4. Tujuan Pengumpulan Data
- Mengidentifikasi dan otentikasi pengguna.  
- Menyediakan fitur personalisasi (mis. nama, peran).  
- Memproses dan menyimpan aktivitas pembelajaran untuk analisis perkembangan.  
- Mengamankan rekaman sesi (audio/video) dan data whiteboard.  
- Meningkatkan kualitas layanan melalui analisis penggunaan.

## 5. Alasan Hukum (Dasar Hukum)
- **Konsentusi**: Pengguna memberi persetujuan eksplisit melalui formulir pendaftaran.  
- **Kontrak**: Pengelolaan layanan Asoboard berdasarkan perjanjian penggunaan.  
- **Kewajiban Hukum**: Penyimpanan data sesuai **PP No. 40 Tahun 2021** dan **UU ITE**.

## 6. Proses Pengolahan Data
- **Pengumpulan**: Data dikumpulkan secara langsung dari pengguna saat mendaftar atau menggunakan fitur.  
- **Penyimpanan**: Data dienkripsi (HTTPS, JWT dengan cookie HTTP‑only) dan disimpan di server Django dengan basis data SQLite (MVP) atau PostgreSQL.  
- **Penggunaan**: Data diproses untuk otentikasi, personalisasi, pencatatan sesi, dan analitik statistik.  
- **Keamanan**: Semua transmisi meliputi TLS 1.2+, data di‑at rest dienkripsi AES‑256, dan audit log rutin.

## 7. Pembagian Data
- **Dengan Mitra**: Data hanya dibagikan dengan mitra teknis (hosting, CDN) yang memiliki **kewajiban kerahasiaan** dan **perjanjian data processing**.  
- **Dengan Otoritas**: Data dapat disampaikan kepada otoritas pemerintah atau penegak hukum sesuai permintaan hukum yang sah.  
- **Tanpa Persetujuan**: Data tidak dijual atau dibagikan untuk tujuan pemasaran tanpa persetujuan eksplisit pengguna.

## 8. Retensi Data
- **Akun**: Disimpan selama masa berlaku layanan atau sampai pengguna meminta penghapusan.  
- **Log Aktivitas**: Disimpan 90 hari untuk audit keamanan.  
- **Rekaman Sesi**: Disimpan 180 hari atau sampai pengguna menghapusnya.  
- **Data Analitik**: Agregasi statistik dipertahankan secara anonim.

## 9. Hak Pengguna
- **Akses**: Pengguna dapat meminta salinan data pribadi yang dimiliki.  
- **Perbaikan**: Pengguna dapat memperbaiki data yang tidak akurat melalui panel profil.  
- **Penghapusan (Right to be Forgotten)**: Pengguna dapat meminta penghapusan data dengan klik “Delete Account”.  
- **Pembatasan Penggunaan**: Pengguna dapat memilih untuk tidak melanjutkan penggunaan layanan.

## 10. Keamanan Data
- **Transportasi**: Semua komunikasi melalui HTTPS dengan sertifikat SSL/TLS.  
- **Simpanan**: Data dienkripsi dengan AES‑256 di server.  
- **Pengawasan**: Sistem monitoring keamanan dan audit log dilakukan secara berkala.  
- **Pencegahan Serangan**: Proteksi CSRF, XSS, dan rate‑limiting pada API.

## 11. Transfer Data Internasional
- Semua data yang diproses berada di server yang berlokasi di Indonesia. Jika ada transfer ke luar negeri (mis. layanan cloud), kami memastikan **klausul persetujuan data** sesuai **PP No. 40 Tahun 2021**.

## 12. Cookie dan Teknologi Pelacakan
- **Cookie Wajib**: Cookie sesi (session_id) yang tidak dapat di‑akses oleh JavaScript (HTTP‑only) untuk otentikasi.  
- **Cookie Pilihan**: Cookie analitik (Google Analytics) hanya aktif setelah persetujuan eksplisit pengguna.  
- **Teknologi Pelacakan**: IP address dan data teknis kami kumpulkan secara anonim untuk analisis performa, tanpa mengidentifikasi individu.

## 13. Data Pribadi Anak
- Asoboard dirancang untuk anak-anak. Kami hanya mengumpulkan data minimal yang diperlukan, dan **orang tua atau wali** harus memberikan persetujuan eksplisit sebelum anak mendaftar. Kami tidak menjual data anak.

## 14. Disclaimer
Saya adalah **Dahono AI**, asisten virtual hukum dan kepatuhan. Meskipun saya berusaha memberikan informasi yang akurat, saya dapat **keliru** pada data atau peraturan yang berlaku. Dokumen ini **hanya untuk tujuan informatif** dan **bukan** pengganti nasihat hukum profesional. Untuk kasus khusus, sebaiknya konsultasikan dengan **ahli hukum**.

## 15. Kontak
Jika ada pertanyaan atau kekhawatiran terkait kebijakan privasi, silakan menghubungi:  
- **Email**: privacy@asoboard.id  
- **Alamat**: Jl. Sudirman No. 123, Jakarta, Indonesia

---

[← Back to README](README.md)
