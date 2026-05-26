const request = require('supertest');
const app = require('../server.js'); // Import naszej aplikacji

describe('Testy jednostkowe REST API', () => {

    // 1. Test odczytu: sprawdzenie poprawnego formatu i statusu
    it('GET /api/posts powinno zwrócić listę postów i status 200', async () => {
        const res = await request(app).get('/api/posts');
        expect(res.statusCode).toEqual(200);
        expect(res.type).toEqual('application/json');
    });

    // 2. Test autoryzacji: niezalogowany użytkownik nie może dodać posta
    it('POST /api/posts powinno zwrócić 401 (Unauthorized) dla gościa', async () => {
        const res = await request(app)
            .post('/api/posts')
            .send({ content: 'Testowy wpis' });
        expect(res.statusCode).toEqual(401);
    });

    // 3. Test walidacji: odrzucenie posta z pustą treścią
    test('POST /api/posts powinno zwrócić błąd 400 przy pustej treści', async () => {
  // 1. Tworzymy "agenta", który będzie zachowywał ciasteczka między zapytaniami
  const agent = request.agent(app);

  // 2. Logujemy się za pomocą agenta
  const loginRes = await agent
    .post('/api/login')
    .send({ login: 'test', password: 'password' });
    
  // Mały test sanity-check: sprawdźmy, czy logowanie w ogóle się udaje!
  expect(loginRes.statusCode).toBe(200);

  // 3. Wysyłamy błędnego posta (agent sam doda ciasteczko sesyjne z poprzedniego kroku)
  const res = await agent
    .post('/api/posts')
    .send({ content: '   ' });

  // 4. Sprawdzamy czy poprawnie odrzucono pustą treść
  expect(res.statusCode).toEqual(400);
});

    // 4. Test uwierzytelniania: odrzucenie błędnych danych logowania
    it('POST /api/login powinno odrzucić błędne hasło ze statusem 401', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ login: 'testuser', password: 'wrongpassword' });
        expect(res.statusCode).toEqual(401);
    });

    // 5. Test wylogowania użytkownika
    it('POST /api/logout powinno poprawnie zniszczyć sesję i zwrócić status 200', async () => {
        const res = await request(app).post('/api/logout');
        expect(res.statusCode).toEqual(200);
    });

});