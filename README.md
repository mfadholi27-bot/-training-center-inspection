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
