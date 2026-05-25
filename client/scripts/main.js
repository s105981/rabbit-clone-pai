// client/scripts/main.js
document.addEventListener('DOMContentLoaded', () => {
    const initialAddPostSection = document.getElementById('add-post-section');
    if (initialAddPostSection) {
        initialAddPostSection.style.display = 'none';
    }
   const addPostForm = document.getElementById('addPostForm');
    const postMessage = document.getElementById('postMessage');

    if (addPostForm) {
        addPostForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Zapobiega przeładowaniu strony [2]

            const content = document.getElementById('postContent').value.trim();

            if (content.length === 0) {
                postMessage.textContent = 'Treść posta nie może być pusta.';
                postMessage.style.color = 'red';
                return;
            }

            // Nie podajemy owner_id, serwer bierze to bezpiecznie z sesji [1]
            const data = { content };

            try {
                const response = await fetch('http://localhost:3000/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (!response.ok) {
                    postMessage.textContent = `Błąd: ${result.message}`;
                    postMessage.style.color = 'red';
                    return;
                }

                postMessage.textContent = result.message;
                postMessage.style.color = 'green';
                addPostForm.reset();
                loadPosts(); // Odświeżenie tablicy z postami po sukcesie

            } catch (err) {
                postMessage.textContent = 'Błąd połączenia z serwerem.';
                postMessage.style.color = 'red';
            }
        });
    }

    // Funkcja pobierająca i wyświetlająca posty
async function loadPosts() {
    // 1. Pobierz kontener, w którym będą wyświetlane wyniki [3]
    const feedSection = document.getElementById('feed-section');

    try {
        // 2. Wyślij asynchroniczne żądanie GET do endpointu API [2]
        const response = await fetch('http://localhost:3000/api/posts');

        // 3. Sprawdź, czy odpowiedź zakończyła się sukcesem [2]
        if (!response.ok) {
            throw new Error('Nie udało się pobrać postów.');
        }

        // 4. Odczytaj dane w formacie JSON [4]
        const posts = await response.json();

        // 5. Dynamiczna aktualizacja interfejsu użytkownika [5]
        // Usuń stare elementy z obszaru wyników (zostawiamy tylko nagłówek) [5]
        feedSection.innerHTML = '<h2>Tablica (Posty)</h2>';

        // Jeśli serwer zwróci pustą listę, wyświetl odpowiedni komunikat [4]
        if (posts.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.textContent = 'Brak danych do wyświetlenia';
            feedSection.appendChild(emptyMessage);
            return;
        }

        // 6. Dla każdego elementu danych utwórz nowe elementy DOM i wypełnij je treścią [5]
        posts.forEach(post => {
            // Tworzenie głównego kontenera na pojedynczy post [1, 5]
            const postDiv = document.createElement('div');
            postDiv.classList.add('post-item'); 
            postDiv.style.border = '1px solid #ccc';
            postDiv.style.borderRadius = '5px';
            postDiv.style.padding = '10px';
            postDiv.style.marginBottom = '10px';

            // Element dla autora (wykorzystujemy dane z zapytania JOIN)
            const authorHeader = document.createElement('h4');
            authorHeader.textContent = `Autor: ${post.author}`; // 'author' to alias z naszego złączenia tabel [5]
            authorHeader.style.margin = '0 0 5px 0';
            authorHeader.style.color = '#007bff';

            // Element dla treści posta
            const contentPara = document.createElement('p');
            contentPara.textContent = post.content;
            contentPara.style.margin = '0 0 10px 0';

            // Element dla daty utworzenia
            const dateSmall = document.createElement('small');
            const dateObj = new Date(post.created_at);
            dateSmall.textContent = `Dodano: ${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString()}`;
            dateSmall.style.color = '#777';

            // 7. Dołącz nowo utworzone elementy do kontenera [5]
            postDiv.appendChild(authorHeader);
            postDiv.appendChild(contentPara);
            postDiv.appendChild(dateSmall);

            feedSection.appendChild(postDiv);
        });

    } catch (err) {
        // Obsługa błędów sieciowych lub problemów z serwerem
        feedSection.innerHTML = '<h2>Tablica (Posty)</h2>';
        const errorMessage = document.createElement('p');
        errorMessage.textContent = 'Błąd połączenia z serwerem. Nie można załadować postów.';
        errorMessage.style.color = 'red';
        feedSection.appendChild(errorMessage);
    }
}

// Wywołaj funkcję od razu po załadowaniu skryptu, aby pokazać posty po wejściu na stronę
loadPosts();
    
    // --- OBSŁUGA REJESTRACJI ---
    const registerForm = document.getElementById('registerForm');
    const registerMessage = document.getElementById('registerMessage');

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Zatrzymuje domyślne odświeżenie strony

            const username = document.getElementById('regUsername').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value;
            const passwordConfirm = document.getElementById('regPassword2').value;

            // Walidacja po stronie klienta
            if (password !== passwordConfirm) {
                registerMessage.textContent = 'Hasła nie są identyczne!';
                registerMessage.style.color = 'red';
                return;
            }

            const data = { username, email, password };

            try {
                // Wysłanie danych do serwera (POST)
                const response = await fetch('http://localhost:3000/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (!response.ok) {
                    registerMessage.textContent = `Błąd: ${result.message}`;
                    registerMessage.style.color = 'red';
                    return;
                }

                registerMessage.textContent = result.message;
                registerMessage.style.color = 'green';
                registerForm.reset(); // Czyszczenie formularza po sukcesie
            } catch (err) {
                registerMessage.textContent = 'Błąd połączenia z serwerem.';
                registerMessage.style.color = 'red';
            }

        });
    }

    // --- OBSŁUGA LOGOWANIA ---
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage'); 

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Zapobiega przeładowaniu strony

            const login = document.getElementById('loginId').value.trim();
            const password = document.getElementById('loginPassword').value;

            try {
                const response = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ login, password })
                });

                const result = await response.json();

                if (!response.ok) {
                    loginMessage.textContent = `Błąd: ${result.message}`;
                    loginMessage.style.color = 'red';
                    return;
                }

                // Sukces logowania
                loginMessage.textContent = result.message;
                loginMessage.style.color = 'green';
                
                // 1. POBRANIE SEKCJI AUTORYZACJI I JEJ UKRYCIE
                const authSection = document.getElementById('auth-section');
if (authSection) {
    authSection.style.display = 'none'; 
}

// 2. POKAZANIE MENU PROFILU (z opcją wylogowania)
const profileMenu = document.getElementById('profileMenu');
if (profileMenu) {
    profileMenu.style.display = 'inline-block'; 
}
const addPostSection = document.getElementById('add-post-section');
if (addPostSection) {
    addPostSection.style.display = 'block'; // Pokazuje formularz postów
}

loadPosts(); // odświeżenie danych

                // 2. ODŚWIEŻENIE DANYCH (opcjonalnie)
                // Skoro użytkownik jest już zalogowany, możemy pobrać posty lub jego dane
                loadPosts(); 
                
            } catch (err) {
                loginMessage.textContent = 'Błąd połączenia z serwerem.';
                loginMessage.style.color = 'red';
            }
        });
    }

    // --- OBSŁUGA WYLOGOWANIA ---
    const logoutBtn = document.getElementById('logoutBtn');
    const profileMenu = document.getElementById('profileMenu');
    const authSection = document.getElementById('auth-section'); 
    const addPostSection = document.getElementById('add-post-section'); // <--- DODANO POBIERANIE SEKCJI

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (event) => {
            event.preventDefault(); 

            try {
                const response = await fetch('http://localhost:3000/api/logout', {
                    method: 'POST',
                    credentials: 'include'
                });

                if (response.ok) {
                    if (authSection) {
                        authSection.style.display = 'block'; 
                    }
                    if (profileMenu) {
                        profileMenu.style.display = 'none';
                    }
                    
                    // DODANO: Ukrywanie formularza dodawania postów po wylogowaniu
                    if (addPostSection) {
                        addPostSection.style.display = 'none';
                    }

                    // Czyszczenie ew. wiadomości na ekranie
                    const loginMessage = document.getElementById('loginMessage');
                    if (loginMessage) loginMessage.textContent = '';
                    
                    const postMessage = document.getElementById('postMessage');
                    if (postMessage) postMessage.textContent = '';

                    alert('Wylogowano pomyślnie.');
                } else {
                    alert('Wystąpił błąd podczas wylogowywania.');
                }
            } catch (err) {
                console.error('Błąd połączenia z serwerem:', err);
            }
        });
    }

    // Funkcja realizująca asynchroniczną komunikację klient-serwer
async function loadExternalData() {
    // 1. Pobranie kontenera na dane z drzewa DOM
    const apiContainer = document.getElementById('apiContainer');

    try {
        // 2. Wysłanie asynchronicznego żądania GET do publicznego API
        const response = await fetch('https://api.nbp.pl/api/exchangerates/tables/A/');

        // 3. Sprawdzenie kodów statusu odpowiedzi (czy zakończyła się sukcesem)
        if (!response.ok) {
            throw new Error('Błąd pobierania danych');
        }

        // 4. Odczytanie danych w formacie JSON
        const data = await response.json();

        // 5. Dynamiczna aktualizacja interfejsu użytkownika na podstawie odpowiedzi
        // 5. Wyciągnięcie kursów walut
        // API NBP zwraca główną odpowiedź jako tablicę, interesuje nas pierwszy element: data[0]
        // Właściwe kursy znajdują się w wewnętrznej tablicy "rates"
        const rates = data[0].rates;

        // Szukamy konkretnych walut (np. Dolar i Euro) po ich kodzie
        const usd = rates.find(rate => rate.code === 'USD');
        const eur = rates.find(rate => rate.code === 'EUR');
        const chf = rates.find(rate => rate.code === 'CHF');
        const gbp = rates.find(rate => rate.code === 'GBP');
        const tryy = rates.find(rate => rate.code === 'TRY');

        // 6. Dynamiczna aktualizacja interfejsu użytkownika
        // Zamiast textContent używamy innerHTML, aby móc dodać tagi HTML (np. <br> i <strong>)
        apiContainer.innerHTML = `
            <strong>Aktualne kursy z tabeli A:</strong><br>
            Dolar amerykański (USD): ${usd.mid} PLN<br>
            Euro (EUR): ${eur.mid} PLN<br>
            Frank Szwajcarski (CHF): ${chf.mid} PLN<br>
            Funt Brytyjski (GBP): ${gbp.mid} PLN<br>
            Lira Turecka (TRY): ${tryy.mid} PLN<br>
        `;
        apiContainer.style.color = '#333';
        
    } catch (err) {
        // 6. Obsługa błędów komunikacji i wyświetlenie informacji o niepowodzeniu
        apiContainer.textContent = 'Błąd połączenia z zewnętrznym API.';
        apiContainer.style.color = 'red';
    }
}

    loadExternalData();
});

