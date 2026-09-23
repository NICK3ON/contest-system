const request = require('supertest');
const app = require('../src/app');

describe('HTTP security boundaries', () => {
  it('rejects malformed JSON as a safe 400 response', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { message: 'Invalid JSON body' } });
  });

  it('rejects oversized JSON as a safe 413 response', async () => {
    const response = await request(app)
      .post('/api/contests/search')
      .send({ query: 'x'.repeat(110 * 1024) });

    expect(response.status).toBe(413);
    expect(response.body).toEqual({ error: { message: 'Request body is too large' } });
  });

  it('rejects role injection during registration before database access', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Injected Admin', email: 'injected@example.com', password: 'TestPass123!', role: 'ADMIN',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Validation failed');
  });

  it('requires authentication for protected endpoints', async () => {
    const response = await request(app).get('/api/users/me/history');
    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Authentication is required');
  });
});
