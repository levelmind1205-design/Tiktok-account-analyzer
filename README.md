# TikTok Account Analyzer — Ready

## Yang sudah jadi
- Input username TikTok
- Backend API `/api/analyze`
- Memanggil Apify Actor `xtracto~tiktok-profile-scraper`
- Mengambil profil + posting yang dikembalikan Actor
- Menghitung followers, likes, jumlah video, rata-rata views, engagement, score
- Menampilkan top videos, keywords, dan rekomendasi

## Menjalankan
1. Install Node.js 18+.
2. Extract ZIP ini.
3. Copy `.env.example` menjadi `.env`.
4. Buka `.env` dan isi:
   APIFY_TOKEN=TOKEN_APIFY_KAMU
5. Terminal di folder project:
   npm install
   npm start
6. Buka http://localhost:3000

JANGAN masukkan token ke file HTML atau JavaScript frontend.

## Deployment
Deploy project ini ke hosting Node.js seperti Render, Railway, Fly.io, atau server Node.js lain. Set `APIFY_TOKEN` sebagai Environment Variable di hosting, lalu deploy.

## Catatan
Actor pihak ketiga dapat berubah schema/output atau harga. Backend memakai mapping yang fleksibel agar perubahan field umum tetap terbaca.
