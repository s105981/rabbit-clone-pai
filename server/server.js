// server/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors({
    origin: 'http://localhost:3000', // lub 'http://127.0.0.1:5500' - zależnie jak otwierasz stronę
    credentials: true // TO JEST KLUCZOWE DLA DZIAŁANIA SESJI
}));

app.use(express.static(path.join(__dirname, '../client')));
const crypto = require('crypto'); // Wbudowany moduł Node.js do losowych ID

// Prosty magazyn sesji w pamięci serwera (mapowanie sessionId -> userId)
const sessions = {}; 

// Middleware 1: Ustanowienie "kontekstu użytkownika" z ciasteczka
app.use((req, res, next) => {
    // Ręczne parsowanie ciasteczek (można też użyć biblioteki cookie-parser)
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(new RegExp('(^| )sessionId=([^;]+)'));
    const sessionId = match ? match[2] : null;

    // Jeśli sesja istnieje w naszym magazynie, przypisz dane do request.user
    if (sessionId && sessions[sessionId]) {
        req.user = sessions[sessionId];
    }
    next();
});

// Middleware 2: Ochrona zasobów prywatnych (wymaga zalogowania)
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Wymagane logowanie' });
    }
    next();
};

// Middleware 3: Ochrona zasobów administracyjnych (RBAC - Role-Based Access Control)
const requireRole = (role) => {
    return (req, res, next) => {
        // Najpierw sprawdzamy, czy w ogóle jest zalogowany
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Wymagane logowanie' });
        }
        // Następnie sprawdzamy wymaganą rolę
        if (req.user.role !== role) {
            return res.status(403).json({ error: 'Forbidden', message: 'Brak uprawnień administracyjnych' });
        }
        next();
    };
};


const bcrypt = require('bcrypt'); // Biblioteka do szyfrowania haseł
const db = require('./db');       // Podłączenie naszego pliku db.js
const PORT = 3000;

// Włączenie parsera JSON do odczytu danych z żądań POST/PUT
app.use(express.json()); 

// ENDPOINT: Rejestracja użytkownika (Create - INSERT)
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Podstawowa walidacja serwerowa
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Brak wymaganych danych.' });
    }

    try {
        // Hashowanie hasła przed zapisem do bazy
        const hashedPassword = await bcrypt.hash(password, 10);

        // Użycie zapytania parametryzowanego ze względów bezpieczeństwa
        const [result] = await db.execute(
            'INSERT INTO Users (username, email, password, role) VALUES (?, ?, ?, ?)', 
            [username, email, hashedPassword, 'user']
        );

        res.status(201).json({ message: 'Konto zostało pomyślnie utworzone!' });
    } catch (err) {
        res.status(400).json({ message: 'Błąd rejestracji. Użytkownik lub e-mail może już istnieć.' });
    }
});

// ENDPOINT: Logowanie użytkownika (Tworzenie sesji)
app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;

    try {
        const [rows] = await db.execute('SELECT * FROM Users WHERE username = ? OR email = ?', [login, login]);
// ZMIANA TUTAJ: Pobieramy pierwszy element z tablicy (indeks 0)
const user = rows[0]; 

if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Niepoprawne dane logowania.' });
}

        // Generowanie bezpiecznego identyfikatora sesji i zapisanie go
        const sessionId = crypto.randomUUID();
        sessions[sessionId] = { id: user.id, role: user.role };

        // Ustawienie ciasteczka w przeglądarce
        res.cookie('sessionId', sessionId, { httpOnly: true });
        
        res.status(200).json({ message: 'Zalogowano pomyślnie!', role: user.role });
    } catch (err) {
        res.status(500).json({ message: 'Błąd serwera.' });
    }
});

// ENDPOINT: Wylogowanie użytkownika (Niszczenie sesji)
app.post('/api/logout', (req, res) => {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(new RegExp('(^| )sessionId=([^;]+)'));
    const sessionId = match ? match[2] : null;

    if (sessionId) {
        delete sessions[sessionId]; // Usunięcie wpisu z pamięci
    }
    
    // Wygaszenie ciasteczka w przeglądarce
    res.clearCookie('sessionId');
    res.status(200).json({ message: 'Wylogowano pomyślnie.' });
});

// ENDPOINT: Tworzenie nowego posta (Zasób prywatny)
// Dodano 'requireAuth' - tylko zalogowany użytkownik ma tu dostęp
app.post('/api/posts', requireAuth, async (req, res) => {
    const { content } = req.body; 
    
    // Bezpieczne pobranie ID z wygenerowanego kontekstu sesji
    const owner_id = req.user.id; 

    if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: 'Treść posta nie może być pusta.' });
    }

    try {
        await db.execute('INSERT INTO Posts (owner_id, content) VALUES (?, ?)', [owner_id, content]);
        res.status(201).json({ message: 'Post został dodany pomyślnie!' });
    } catch (err) {
        res.status(500).json({ message: 'Błąd podczas dodawania posta.' });
    }
});

// ENDPOINT: Przykładowy zasób tylko dla administratora (Wymaga roli 'admin')
app.get('/api/admin/users', requireRole('admin'), async (req, res) => {
    try {
        const [users] = await db.execute('SELECT id, username, email, role FROM Users');
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ message: 'Błąd bazy danych' });
    }
});

/* 
Bigos: 1 kg kiszonej kapusty, 500 g świeżej kapusty, 500 g karkówki lub łopatki, 
300 g kiełbasy, 100 g boczku, 1 cebula, 2 garście suszonych grzybów, 5 suszonych śliwek, 
2 liście laurowe, 4 ziarna ziela angielskiego, 2 łyżki koncentratu pomidorowego, sól, pieprz, majeranek; 
kapustę ugotuj, mięso i boczek podsmaż z cebulą, dodaj kiełbasę, grzyby i śliwki, 
wszystko wymieszaj z kapustą, dodaj przyprawy i koncentrat, duś 2–3 godziny mieszając od czasu do czasu. 
*/

// ENDPOINT: Pobieranie wszystkich postów na tablicę (Read - SELECT)
app.get('/api/posts', async (req, res) => {
    try {
        // Wykonanie zapytania SQL z instrukcją JOIN
        const [posts] = await db.execute(`
            SELECT Posts.id, Posts.content, Posts.created_at, Users.username AS author
            FROM Posts
            JOIN Users ON Posts.owner_id = Users.id
            ORDER BY Posts.id DESC
        `);

        // Wysłanie prawidłowej odpowiedzi z kodem 200 (OK) i danymi w formacie JSON
        res.status(200).json(posts);
        
    } catch (err) {
        // Przechwycenie wyjątków i obsługa błędów awaryjnych (np. brak połączenia z bazą)
        console.error(err);
        res.status(500).json({ error: 'InternalServerError', message: 'Błąd podczas pobierania postów.' });
    }
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie http://localhost:${PORT}`);
});