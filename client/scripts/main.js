document.addEventListener('DOMContentLoaded', () => {
    // Stan globalny aplikacji
    let currentUser = null; 
    let currentChatPartnerId = null;

    // --- REJESTRACJA ---
    const registerForm = document.getElementById('registerForm');
    const registerMessage = document.getElementById('registerMessage');

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = document.getElementById('regUsername').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value;
            const passwordConfirm = document.getElementById('regPassword2').value;

            if (password !== passwordConfirm) {
                registerMessage.textContent = 'Hasła nie są identyczne!';
                registerMessage.style.color = 'red';
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
                const result = await response.json();
                
                registerMessage.textContent = response.ok ? result.message : `Błąd: ${result.message}`;
                registerMessage.style.color = response.ok ? 'green' : 'red';
                if (response.ok) registerForm.reset();
            } catch (err) {
                registerMessage.textContent = 'Błąd serwera.';
                registerMessage.style.color = 'red';
            }
        });
    }

    // --- LOGOWANIE ---
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage'); 

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
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
                    loginMessage.textContent = result.message;
                    loginMessage.style.color = 'red';
                    return;
                }

                // Sukces: Zapisz kim jesteśmy!
                currentUser = { id: result.id, username: result.username };

                // Ukryj auth, pokaż UI
                document.getElementById('auth-section').style.display = 'none'; 
                document.getElementById('profileMenu').style.display = 'inline-block'; 
                document.getElementById('friendsDropdown').style.display = 'inline-block'; 
                document.getElementById('add-post-section').style.display = 'block';

                loadPosts(); 
            } catch (err) {
                loginMessage.textContent = 'Błąd połączenia z serwerem.';
                loginMessage.style.color = 'red';
            }
        });
    }

    // --- WYLOGOWANIE ---
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (event) => {
            event.preventDefault(); 
            try {
                const response = await fetch('http://localhost:3000/api/logout', { method: 'POST', credentials: 'include' });
                if (response.ok) {
                    currentUser = null;
                    currentChatPartnerId = null;
                    
                    document.getElementById('auth-section').style.display = 'block'; 
                    document.getElementById('profileMenu').style.display = 'none';
                    document.getElementById('friendsDropdown').style.display = 'none';
                    document.getElementById('add-post-section').style.display = 'none';
                    document.getElementById('search-section').style.display = 'none';
                    document.getElementById('chat-section').style.display = 'none';
                    document.getElementById('friendsList').innerHTML = ''; // Wyczyszczenie listy
                    
                    alert('Wylogowano.');
                }
            } catch (err) {
                console.error(err);
            }
        });
    }

    // --- POBIERANIE ZEWNĘTRZNEGO API (NBP) ---
    async function loadExternalData() {
        const apiContainer = document.getElementById('apiContainer');
        try {
            const response = await fetch('https://api.nbp.pl/api/exchangerates/tables/A/');
            if (!response.ok) throw new Error();
            const rates = (await response.json())[0].rates;
            
            const usd = rates.find(r => r.code === 'USD').mid;
            const eur = rates.find(r => r.code === 'EUR').mid;

            apiContainer.innerHTML = `<strong>USD:</strong> ${usd} PLN | <strong>EUR:</strong> ${eur} PLN`;
        } catch (err) {
            apiContainer.textContent = 'Błąd pobierania kursów.';
        }
    }
    loadExternalData();

    // --- DODAWANIE POSTA ---
    const addPostForm = document.getElementById('addPostForm');
    if (addPostForm) {
        addPostForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const content = document.getElementById('postContent').value.trim();
            const postMessage = document.getElementById('postMessage');

            try {
                const response = await fetch('http://localhost:3000/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ content })
                });

                if (response.ok) {
                    addPostForm.reset();
                    postMessage.textContent = '';
                    loadPosts();
                } else {
                    postMessage.textContent = 'Błąd dodawania.';
                }
            } catch (err) {
                console.error(err);
            }
        });
    }

    // --- ŁADOWANIE POSTÓW (I USUWANIE WŁASNYCH) ---
    async function loadPosts() {
        const feedSection = document.getElementById('feed-section');
        try {
            const response = await fetch('http://localhost:3000/api/posts');
            const posts = await response.json();
            
            feedSection.innerHTML = '<h2>Tablica (Posty)</h2>';
            if (posts.length === 0) {
                feedSection.innerHTML += '<p>Brak postów.</p>';
                return;
            }

            posts.forEach(post => {
                const postDiv = document.createElement('div');
                postDiv.style.cssText = 'background: white; border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin-bottom: 15px; position: relative;';

                const authorHeader = document.createElement('h4');
                authorHeader.textContent = `Autor: ${post.author}`;
                authorHeader.style.cssText = 'margin: 0 0 5px 0; color: #007bff;';

                const contentPara = document.createElement('p');
                contentPara.textContent = post.content;

                const dateSmall = document.createElement('small');
                dateSmall.textContent = `Dodano: ${new Date(post.created_at).toLocaleString()}`;
                dateSmall.style.color = '#777';

                postDiv.appendChild(authorHeader);
                postDiv.appendChild(contentPara);
                postDiv.appendChild(dateSmall);

                // Przycisk usuwania dla własnych postów
                if (currentUser && post.owner_id === currentUser.id) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Usuń wpis';
                    deleteBtn.style.cssText = 'position: absolute; top: 15px; right: 15px; background-color: #dc3545; padding: 5px 10px; font-size: 12px;';
                    
                    deleteBtn.addEventListener('click', async () => {
                        if (confirm('Usunąć ten post?')) {
                            const res = await fetch(`http://localhost:3000/api/posts/${post.id}`, { method: 'DELETE', credentials: 'include' });
                            if (res.ok) loadPosts();
                        }
                    });
                    postDiv.appendChild(deleteBtn);
                }
                feedSection.appendChild(postDiv);
            });
        } catch (err) {
            console.error(err);
        }
    }
    loadPosts(); // Załaduj na start

    // --- WYSZUKIWARKA (Pokazywanie/Ukrywanie z menu) ---
    const menuSearchBtn = document.getElementById('menuSearchBtn');
    const searchSection = document.getElementById('search-section');
    
    if (menuSearchBtn) {
        menuSearchBtn.addEventListener('click', (event) => {
            event.preventDefault();
            searchSection.style.display = searchSection.style.display === 'none' ? 'block' : 'none';
        });
    }

    const searchUserForm = document.getElementById('searchUserForm');
    const searchResults = document.getElementById('searchResults');

    if (searchUserForm) {
        searchUserForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const query = document.getElementById('searchUserInput').value.trim();

            try {
                const response = await fetch(`http://localhost:3000/api/users/search?username=${query}`, { credentials: 'include' });
                const users = await response.json();
                searchResults.innerHTML = ''; 

                if (users.length === 0) {
                    searchResults.innerHTML = '<p>Nikogo nie znaleziono.</p>';
                    return;
                }

                users.forEach(user => {
                    if (currentUser && user.id === currentUser.id) return; // Ukryj samego siebie

                    const div = document.createElement('div');
                    div.classList.add('search-result-item');
                    div.innerHTML = `<strong>${user.username}</strong> <button style="background: #28a745;">Dodaj i Pisz</button>`;
                    
                    // Kliknięcie w guzik
                    div.querySelector('button').addEventListener('click', () => {
                        addToFriendsList(user.id, user.username);
                        openChatWindow(user.id, user.username);
                        searchSection.style.display = 'none'; // Ukrywamy wyszukiwarkę po akcji
                        document.getElementById('searchUserInput').value = '';
                    });
                    searchResults.appendChild(div);
                });
            } catch (err) {
                searchResults.innerHTML = '<p>Błąd pobierania.</p>';
            }
        });
    }

    // --- DODAWANIE DO MENU ZNAJOMYCH ---
    function addToFriendsList(id, username) {
        const friendsList = document.getElementById('friendsList');
        if (!document.getElementById(`friend-${id}`)) {
            const friendLink = document.createElement('a');
            friendLink.href = '#';
            friendLink.id = `friend-${id}`;
            friendLink.textContent = username;
            
            friendLink.addEventListener('click', (e) => {
                e.preventDefault();
                openChatWindow(id, username);
            });
            friendsList.appendChild(friendLink);
        }
    }

    // --- ZWIJANY CZAT ---
    const chatHeader = document.getElementById('chatHeader');
    const chatBody = document.getElementById('chatBody');
    const chatSection = document.getElementById('chat-section');

    if (chatHeader) {
        chatHeader.addEventListener('click', () => {
            chatBody.style.display = chatBody.style.display === 'none' ? 'block' : 'none';
        });
    }

    function openChatWindow(id, username) {
        currentChatPartnerId = id;
        chatSection.style.display = 'flex';       
        chatBody.style.display = 'block';         
        document.getElementById('chatTitle').textContent = `Czat: ${username}`;
        loadChat();
    }

    const chatForm = document.getElementById('chatForm');
    const chatBox = document.getElementById('chatBox');

    async function loadChat() {
        if (!currentChatPartnerId) return;

        try {
            const response = await fetch(`http://localhost:3000/api/chat/${currentChatPartnerId}`, { credentials: 'include' });
            if (!response.ok) return;

            const messages = await response.json();
            chatBox.innerHTML = '';
            
            if (messages.length === 0) {
                chatBox.innerHTML = '<p style="color:#777; text-align:center;">Brak wcześniejszych wiadomości. Napisz coś!</p>';
            } else {
                messages.forEach(msg => {
                    const msgEl = document.createElement('div');
                    msgEl.style.marginBottom = '8px';
                    if (currentUser && msg.author === currentUser.username) {
                        msgEl.innerHTML = `<span style="color:#007bff;"><b>Ty:</b></span> ${msg.message}`;
                        msgEl.style.textAlign = 'right';
                    } else {
                        msgEl.innerHTML = `<span style="color:#28a745;"><b>${msg.author}:</b></span> ${msg.message}`;
                    }
                    chatBox.appendChild(msgEl);
                });
            }
            chatBox.scrollTop = chatBox.scrollHeight;
        } catch (err) {
            console.error(err);
        }
    }

    if (chatForm) {
        chatForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const messageInput = document.getElementById('chatInput');

            if (!currentChatPartnerId) return;

            try {
                await fetch('http://localhost:3000/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ message: messageInput.value, receiver_id: currentChatPartnerId })
                });
                messageInput.value = ''; 
                loadChat(); 
            } catch (err) {
                console.error(err);
            }
        });
    }

    // Auto-odświeżanie czatu co 3 sekundy
    setInterval(loadChat, 3000);
});