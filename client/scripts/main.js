// client/scripts/main.js
document.addEventListener('DOMContentLoaded', () => {

    const addPostForm = document.getElementById('addPostForm');
const postMessage = document.getElementById('postMessage');

if (addPostForm) {
    addPostForm.addEventListener('submit', async (event) => {
        // Zablokowanie domyślnego zachowania przeglądarki (przeładowania strony) [9]
        event.preventDefault();

        // Pobranie wartości i walidacja po stronie klienta (usuwanie białych znaków) [11]
        const content = document.getElementById('postContent').value.trim();
        const owner_id = document.getElementById('postOwnerId').value;

        if (content.length === 0) {
            postMessage.textContent = 'Treść posta nie może być pusta.';
            postMessage.style.color = 'red';
            return;
        }

        const data = { owner_id, content };

        try {
            // Asynchroniczne wysłanie danych formularza do serwera metodą POST [10]
            const response = await fetch('http://localhost:3000/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            // Odczytanie odpowiedzi w formacie JSON [12]
            const result = await response.json();

            if (!response.ok) {
                postMessage.textContent = `Błąd: ${result.message}`;
                postMessage.style.color = 'red';
                return;
            }

            // Komunikat o sukcesie
            postMessage.textContent = result.message;
            postMessage.style.color = 'green';
            
            // Wyczyszczenie pola tekstowego formularza po poprawnym wysłaniu danych [13]
            addPostForm.reset();
            
            // Dynamiczne odświeżenie interfejsu - ponowne pobranie postów z bazy [12, 14]
            loadPosts(); 

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
    const loginMessage = document.getElementById('loginMessage'); // Musisz dodać <div id="loginMessage"> w HTML pod logowaniem

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const login = document.getElementById('loginId').value.trim();
            const password = document.getElementById('loginPassword').value;

            try {
                const response = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ login, password })
                });

                const result = await response.json();

                if (!response.ok) {
                    loginMessage.textContent = `Błąd: ${result.message}`;
                    loginMessage.style.color = 'red';
                    return;
                }

                loginMessage.textContent = result.message;
                loginMessage.style.color = 'green';
                
                // Tutaj w przyszłości dodamy ukrywanie panelu logowania i pobieranie postów
            } catch (err) {
                loginMessage.textContent = 'Błąd połączenia z serwerem.';
                loginMessage.style.color = 'red';
            }
        });
    }
});