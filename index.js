import express from 'express';
import sqlite3 from 'sqlite3';
import bodyParser from 'body-parser';
import stringSimilarity from 'string-similarity';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import dylux from 'api-dylux';

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

const db = new sqlite3.Database('./db.sqlite');
db.run(`CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT,
    answer TEXT
)`);

function cleanQuery(text) {
    return text
        .toLowerCase()
        .replace(/^(apa itu|siapa itu|apa yang dimaksud|pengertian|jelaskan|apa itu yang disebut)/i, '')
        .trim();
}

async function searchWiki(query) {
    const cleaned = cleanQuery(query);
    console.log("🔎 Wikipedia search keyword:", cleaned);

    try {
        const res = await fetch(`https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleaned)}`);
        if (!res.ok) return null;

        const data = await res.json();
        if (data.extract && data.type !== 'disambiguation') return data.extract;
        return null;
    } catch (err) {
        console.error("❌ Wiki error:", err);
        return null;
    }
}

async function handleAsk(message, res) {
    if (typeof message !== 'string') {
        return res.status(400).json({ error: 'message harus berupa string' });
    }

    db.all(`SELECT question, answer FROM chats`, [], async (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        const questions = rows
            .map(r => typeof r.question === 'string' ? r.question : '')
            .filter(q => q.length > 0);

        if (!Array.isArray(questions) || questions.length === 0) {
            return res.json({ reply: 'Aku belum tahu jawabannya 😅' });
        }

        const match = stringSimilarity.findBestMatch(message, questions);

        if (match.bestMatch.rating > 0.6) {
            const best = rows.find(r => r.question === match.bestMatch.target);
            if (best && best.answer !== 'Belum tahu jawabannya') {
                return res.json({ reply: best.answer });
            }
        }

        const wikiAnswer = await searchWiki(message);

        if (wikiAnswer) {
            db.run(`INSERT INTO chats (question, answer) VALUES (?, ?)`, [message, wikiAnswer], () => {
                return res.json({ reply: wikiAnswer + " (sumber: Wikipedia)" });
            });
        } else {
            db.run(`INSERT INTO chats (question, answer) VALUES (?, ?)`, [message, 'Belum tahu jawabannya'], () => {
                return res.json({ reply: 'Aku belum tahu jawabannya 😅' });
            });
        }
    });
}

app.post('/simi/ask', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });
    await handleAsk(message, res);
});

app.get('/simi/ask', async (req, res) => {
    const message = req.query.message;
    if (!message) return res.status(400).json({ error: 'Parameter ?message wajib diisi' });
    await handleAsk(message, res);
});

app.post('/simi/learn', (req, res) => {
    const { question, answer } = req.body;
    if (!question || !answer) return res.status(400).json({ error: 'Question and answer are required' });

    db.run(`INSERT INTO chats (question, answer) VALUES (?, ?)`, [question, answer], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to save' });
        return res.json({ message: 'Terima kasih! Aku belajar sesuatu yang baru 😊' });
    });
});

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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`✅ API aktif di http://localhost:${port}`);
});