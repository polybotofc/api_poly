import express from 'express';
import dylux from 'api-dylux';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Folder public untuk HTML
app.use(express.static(path.join(__dirname, 'public')));

// API TikTok Downloader
app.get('/download', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ message: 'URL TikTok tidak ditemukan!' });

  try {
    const result = await dylux.tiktok(url);
    const data = result.result;

    res.json({
      status: 'success',
      video_no_wm: data.play,
      video_wm: data.wmplay,
      cover: data.cover,
      author: data.author.nickname,
      title: data.title
    });
  } catch (error) {
    console.error('Error TikTok:', error);
    res.status(500).json({ message: 'Gagal mengambil video TikTok!' });
  }
});

// Halaman utama
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Jalankan server (jika tidak di Vercel)
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`✅ Server berjalan di http://localhost:${port}`);
  });
}

// Export untuk Vercel
export default app;
