# Training Center Inspection

Aplikasi web ringan dengan tema Dark Animated Glassmorphism untuk pencatatan ruangan, inventaris, inspeksi, riwayat, dan backup lokal.

## Fitur versi awal
- Tampilan responsif dengan animasi CSS dan navigasi slide.
- Menu samping dan navigasi bawah.
- Dukungan gestur geser kiri/kanan.
- Data ruangan, inventaris, dan pemeriksaan disimpan di IndexedDB.
- Foto pemeriksaan dikompres di perangkat sebelum disimpan.
- Ekspor backup JSON, impor backup, dan ekspor CSV.
- Service Worker untuk cache aset agar bisa dibuka offline setelah kunjungan online pertama.
- Tidak menggunakan framework atau aset eksternal.

## Pasang melalui GitHub Pages
1. Unggah semua berkas dan folder ini ke akar repositori GitHub.
2. Buka **Settings → Pages**.
3. Pilih **Deploy from a branch**, branch `main`, folder `/(root)`, lalu Save.
4. Buka alamat Pages saat terhubung internet sekali dan tunggu aplikasi dimuat.
5. Untuk menguji offline, buka aplikasi sekali lagi setelah service worker terpasang, lalu aktifkan mode pesawat dan muat ulang/buka ulang aplikasi.
6. Ekspor backup JSON secara berkala. Data IndexedDB terikat pada browser dan perangkat.

## Catatan
- GitHub Pages menyajikan kode statis; data inspeksi tidak disimpan di GitHub.
- Data lokal bisa hilang jika data situs/browser dihapus, profil browser berubah, atau perangkat hilang. Backup penting.
- Untuk impor backup, data dengan ID yang sama diperbarui; data lainnya dipertahankan.
- Jangan masukkan informasi rahasia perusahaan atau data pribadi sensitif tanpa persetujuan dan kebijakan internal yang sesuai.
- Ini starter app untuk diuji; sesuaikan proses dan format laporan dengan standar perusahaan sebelum penggunaan resmi.


## Versi 1.2 — peningkatan inventaris
- Kategori inventaris.
- Kode barang otomatis saat kolom kode dikosongkan; kode manual yang duplikat ditolak.
- Pencarian berdasarkan nama, kode, kategori, dan ruangan.
- Filter kondisi barang.
- Riwayat perubahan kondisi dengan waktu.
- Ekspor CSV mencakup kategori.
- Data inventaris versi lama tetap dapat ditampilkan; kategori lama akan ditampilkan sebagai “Lainnya”.

Paket ini belum otomatis mengubah repositori GitHub atau situs yang sudah dipublikasikan. Unggah isi ZIP ini ke branch `development-v1.1`, lalu uji sebelum digabungkan ke `main`.


## Pembaruan v1.2.0
- Ikon menu atas diseimbangkan dan dibuat lebih rapi.
- Ikon profil diperbaiki agar simetris dengan ukuran dan garis yang konsisten.
- Versi cache service worker diperbarui agar browser mengambil tampilan terbaru.
- `icon.svg` tetap berada di direktori utama karena `index.html` dan `manifest.json` merujuk ke `./icon.svg`.


## Pembaruan v1.3.0
- Ekspor lembar kerja Excel-kompatibel (.xls) dengan tiga lembar: Inventaris, Ruangan, dan Riwayat Pemeriksaan.
- Header kolom seragam, lebar kolom diatur, teks panjang dibungkus, dan header dibekukan untuk memudahkan salin-tempel ke master.
- Ekspor arsip foto terpisah dalam JSON yang menyertakan data foto dan metadata pemeriksaan. Arsip foto ini bukan ZIP gambar; foto disimpan sebagai data URL/base64 agar ekspor tetap bisa bekerja offline tanpa pustaka tambahan.


## Pembaruan v1.4.0
- Nama file ekspor Excel otomatis mengikuti nama pemeriksa aktif dan tanggal ekspor, contoh `Training-Center_Amak_Fadholi_2026-10-23.xls`.
- Nama arsip foto otomatis mengikuti pola `Arsip-Foto_Amak_Fadholi_2026-10-23.json`.
- Nama file dibersihkan dari karakter yang tidak aman untuk nama file. Pastikan nama pemeriksa sudah diatur di profil sebelum mengekspor.


## Pembaruan v1.5.0
- Ekspor utama menghasilkan file Excel asli `.xlsx` (bukan CSV atau XML ber-ekstensi XLS).
- Foto pemeriksaan tertanam langsung pada lembar `Dokumentasi Foto` bersama metadata tanggal, pemeriksa, ruangan, jenis, hasil, dan catatan.
- Nama file otomatis memakai nama pemeriksa dan tanggal ekspor.
- Ekspor arsip foto JSON tetap tersedia sebagai cadangan opsional.


## Perbaikan v1.5.1
- Memperbaiki struktur relasi gambar pada lembar `Dokumentasi Foto` agar elemen gambar tidak terduplikasi.
- Memperjelas bahwa foto yang diekspor adalah foto yang dilampirkan pada catatan Pemeriksaan saat disimpan.
- Jika tidak ada foto pada catatan pemeriksaan, lembar dokumentasi tidak akan memiliki gambar; ekspor tidak mengambil foto secara otomatis dari galeri perangkat.


## Pembaruan v1.6.0
- Mengganti pembuatan paket XLSX manual dengan ExcelJS untuk ekspor foto tertanam menggunakan format Office Open XML yang valid.
- Foto JPG/PNG/GIF yang tersimpan pada catatan pemeriksaan ditempatkan pada lembar `Dokumentasi Foto`.
- ExcelJS dan SheetJS dimuat saat diperlukan melalui CDN; untuk ekspor foto, koneksi internet diperlukan ketika pustaka belum pernah dimuat.
- Nama file memakai nama pemeriksa dan tanggal ekspor. Jika belum ada foto tersimpan, file tetap diekspor tanpa gambar dan menampilkan pemberitahuan.


## Perbaikan v1.6.1
- Memperbaiki error ekspor `Cannot read properties of undefined (reading 'id')` dengan menghapus upaya menghapus worksheet yang belum dibuat pada workbook ExcelJS yang baru.


## Pembaruan v1.7.0 — Ikon profesional
- Mengganti ikon navigasi berbasis karakter menjadi ikon SVG yang konsisten untuk Beranda, Ruangan, Inspeksi, Barang, dan Riwayat.
- Memperbesar ikon navigasi bawah, tombol menu, profil, dan penanda merek.
- Merapikan ukuran ikon dan label agar lebih mudah digunakan pada layar ponsel.


## Pembaruan v1.8.0
- Ikon menu samping disamakan dengan ikon navigasi utama menggunakan SVG.
- Foto pada Riwayat tersembunyi secara default dan baru terlihat setelah tombol Lihat foto dokumentasi ditekan.
- Inventaris dikelompokkan dalam panel kategori yang dapat dibuka/tutup.
- Meja, kursi, papan tulis, podium, lemari kelas, dan bangku otomatis memilih kategori Perlengkapan Kelas; kategori lama Furniture/Peralatan kelas ikut ditampilkan dalam kelompok itu.
