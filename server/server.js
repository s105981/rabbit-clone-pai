// server/server.js
const express = require('express');
const cors = require('cors'); // Zaimportuj paczkę
const app = express();

app.use(cors()); // Uruchom CORS dla wszystkich ścieżek

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

// ENDPOINT: Logowanie użytkownika (POST)
app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ message: 'Podaj login i hasło.' });
    }

    try {
        // Zależnie od tego, czy użytkownik użył emaila czy loginu
        const [rows] = await db.execute('SELECT * FROM Users WHERE username = ? OR email = ?', [login, login]);
        const user = rows;

        if (!user) {
            return res.status(401).json({ message: 'Niepoprawne dane logowania.' });
        }

        // Porównanie hasła przesłanego z hashem w bazie
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Niepoprawne dane logowania.' });
        }

        // Tutaj w przyszłości wygenerujemy sesję lub token
        res.status(200).json({ message: 'Zalogowano pomyślnie!', userId: user.id });
    } catch (err) {
        res.status(500).json({ message: 'Błąd serwera.' });
    }
});

// ENDPOINT: Tworzenie nowego posta (Create - INSERT) [5]
app.post('/api/posts', async (req, res) => {
    // Odczytanie danych przesyłanych w formacie JSON [6]
    const { owner_id, content } = req.body; 

    // Walidacja danych po stronie serwera [6]
    if (!owner_id || !content || content.trim().length === 0) {
        return res.status(400).json({ message: 'Treść posta nie może być pusta.' });
    }

    try {
        // Zapytanie parametryzowane SQL (z użyciem znaków zapytania), aby zapobiec SQL Injection [4]
        const [result] = await db.execute(
            'INSERT INTO Posts (owner_id, content) VALUES (?, ?)', 
            [owner_id, content]
        );

        // Zwrócenie kodu statusu 201 (Created) oznaczającego pomyślne utworzenie zasobu [4]
        res.status(201).json({ message: 'Post został dodany pomyślnie!' });
    } catch (err) {
        console.error(err);
        // Zwrócenie ogólnego komunikatu błędu w formacie JSON [7]
        res.status(500).json({ error: 'InternalServerError', message: 'Błąd podczas dodawania posta.' });
    }
});

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