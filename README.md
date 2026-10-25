# Training Center Inspection v2.0.6

Pembaruan gabungan:
- Filter kategori pada formulir inspeksi; daftar barang disaring berdasarkan ruangan dan kategori.
- Setiap catatan inspeksi menyimpan nama ruangan pada saat pemeriksaan, sehingga riwayat lama tetap menunjukkan lokasi saat diperiksa meskipun inventaris kemudian dipindahkan.
- Riwayat pemeriksaan menampilkan nama barang, kode unik, kategori, ruangan saat diperiksa, tanggal, dan pemeriksa.
- Pembuatan banyak barang sekaligus (contoh Meja 01–24) tetap tersedia.
- Cache offline diperbarui ke v2.0.6.

## Catatan pembaruan
Sebelum mengganti file pada GitHub Pages, ekspor/backup data JSON dari aplikasi. Setelah mengunggah file versi ini, muat ulang aplikasi. Data lama yang sudah tersimpan tidak dihapus; catatan inspeksi lama yang dibuat sebelum v2.0.6 mungkin belum memiliki snapshot ruangan dan akan menampilkan nama ruangan terkini sebagai fallback.

## Cara memasang
1. Ekspor backup JSON dari aplikasi terlebih dahulu.
2. Ekstrak ZIP ini.
3. Unggah file-file di dalam folder ke akar (root) branch yang dipakai GitHub Pages dan timpa file lama.
4. Tunggu GitHub Pages selesai diterbitkan, lalu muat ulang aplikasi.
