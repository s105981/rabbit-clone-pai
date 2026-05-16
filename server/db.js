// server/db.js
const mysql = require('mysql2/promise'); // Wymaga instalacji sterownika

// Konfiguracja puli połączeń z bazą danych
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',           // Zmień na swojego użytkownika
    password: '',           // Wpisz swoje hasło
    database: 'social_db',  // Nazwa Twojej bazy danych
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;