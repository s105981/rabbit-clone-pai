// server/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

app.use(express.static(path.join(__dirname, '../client')));
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('./db');

const sessions = {}; 

app.use((req, res, next) => {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(new RegExp('(^| )sessionId=([^;]+)'));
    const sessionId = match ? match[2] : null;

    if (sessionId && sessions[sessionId]) {
        req.user = sessions[sessionId];
    }
    next();
});

const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Wymagane logowanie' });
    }
    next();
};

const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Wymagane logowanie' });
        }
        if (req.user.role !== role) {
            return res.status(403).json({ error: 'Forbidden', message: 'Brak uprawnień administracyjnych' });
        }
        next();
    };
};

const PORT = 3000;
app.use(express.json()); 

app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: 'Brak wymaganych danych.' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute(
            'INSERT INTO Users (username, email, password, role) VALUES (?, ?, ?, ?)', 
            [username, email, hashedPassword, 'user']
        );
        res.status(201).json({ message: 'Konto zostało pomyślnie utworzone!' });
    } catch (err) {
        res.status(400).json({ message: 'Błąd rejestracji. Użytkownik lub e-mail może już istnieć.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;
    try {
        const [rows] = await db.execute('SELECT * FROM Users WHERE username = ? OR email = ?', [login, login]);
        const user = rows[0]; 

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Niepoprawne dane logowania.' });
        }

        const sessionId = crypto.randomUUID();
        sessions[sessionId] = { id: user.id, role: user.role };

        res.cookie('sessionId', sessionId, { httpOnly: true });
        
        // Zwracamy id i username do frontendu
        res.status(200).json({ message: 'Zalogowano pomyślnie!', role: user.role, id: user.id, username: user.username });
    } catch (err) {
        res.status(500).json({ message: 'Błąd serwera.' });
    }
});

app.post('/api/logout', (req, res) => {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(new RegExp('(^| )sessionId=([^;]+)'));
    const sessionId = match ? match[2] : null;

    if (sessionId) delete sessions[sessionId];
    
    res.clearCookie('sessionId');
    res.status(200).json({ message: 'Wylogowano pomyślnie.' });
});

app.post('/api/posts', requireAuth, async (req, res) => {
    const { content } = req.body; 
    const owner_id = req.user.id; 

    if (!content || content.trim().length === 0) return res.status(400).json({ message: 'Treść posta nie może być pusta.' });

    try {
        await db.execute('INSERT INTO Posts (owner_id, content) VALUES (?, ?)', [owner_id, content]);
        res.status(201).json({ message: 'Post został dodany pomyślnie!' });
    } catch (err) {
        res.status(500).json({ message: 'Błąd podczas dodawania posta.' });
    }
});

// Zmieniony endpoint - dodano Posts.owner_id
app.get('/api/posts', async (req, res) => {
    try {
        const [posts] = await db.execute(`
            SELECT Posts.id, Posts.content, Posts.created_at, Posts.owner_id, Users.username AS author
            FROM Posts
            JOIN Users ON Posts.owner_id = Users.id
            ORDER BY Posts.id DESC
        `);
        res.status(200).json(posts);
    } catch (err) {
        res.status(500).json({ error: 'InternalServerError', message: 'Błąd pobierania postów.' });
    }
});

// Nowy endpoint do usuwania postów
app.delete('/api/posts/:id', requireAuth, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;

    try {
        const [result] = await db.execute('DELETE FROM Posts WHERE id = ? AND owner_id = ?', [postId, userId]);
        if (result.affectedRows === 0) {
            return res.status(403).json({ message: 'Brak uprawnień lub post nie istnieje.' });
        }
        res.status(200).json({ message: 'Post został usunięty.' });
    } catch (err) {
        res.status(500).json({ message: 'Błąd usuwania posta.' });
    }
});

app.get('/api/users/search', requireAuth, async (req, res) => {
    const query = req.query.username; 
    if (!query) return res.status(400).json({ message: 'Podaj login do wyszukania.' });

    try {
        const [users] = await db.execute('SELECT id, username FROM Users WHERE username LIKE ?', [`%${query.trim()}%`]);
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ message: 'Błąd serwera.' });
    }
});

app.get('/api/chat/:receiverId', requireAuth, async (req, res) => {
    const myId = req.user.id; 
    const otherUserId = Number(req.params.receiverId);

    try {
        const [messages] = await db.execute(`
            SELECT c.id, c.message, u.username as author 
            FROM ChatMessages c 
            JOIN Users u ON c.sender_id = u.id 
            WHERE (c.sender_id = ? AND c.receiver_id = ?) OR (c.sender_id = ? AND c.receiver_id = ?)
            ORDER BY c.created_at ASC
        `, [myId, otherUserId, otherUserId, myId]);
        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json({ message: 'Błąd pobierania czatu.' });
    }
});

app.post('/api/chat', requireAuth, async (req, res) => {
    const { message, receiver_id } = req.body;
    const sender_id = req.user.id; 

    if (!message || !receiver_id) return res.status(400).json({ message: 'Błędne dane wiadomości.' });

    try {
        await db.execute('INSERT INTO ChatMessages (sender_id, receiver_id, message) VALUES (?, ?, ?)', [sender_id, receiver_id, message]);
        res.status(201).json({ message: 'Wysłano' });
    } catch (err) {
        res.status(500).json({ message: 'Błąd wysyłania.' });
    }
});

app.listen(PORT, () => {
    console.log(`Serwer działa na porcie http://localhost:${PORT}`);
});

module.exports = app;