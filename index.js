import express from 'express';
import dylux from 'api-dylux';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { parse } from 'url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Public folder
app.use(express.static(path.join(__dirname, 'public')));

// TikTok Downloader Endpoint
app.get('/download', async (req, res) => {
  const url = req.query.url;
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
    console.error('Gagal mengambil video TikTok:', error);
    res.status(500).json({ message: 'Gagal mengambil video TikTok!' });
  }
});

// Halaman utama
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ EXPORT UNTUK VERCEL SERVERLESS FUNCTION
export default function handler(req, res) {
  const parsedUrl = parse(req.url, true);
  app(req, res);
}
