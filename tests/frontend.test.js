const request = require('supertest');
const app = require('../src/app');

describe('optional demo frontend', () => {
  it('serves the isolated demo UI', async () => {
    const response = await request(app).get('/demo/');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('<title>Contest System</title>');
    expect(response.text).toContain('Create a contest');
    expect(response.text).toContain('Add a manual question');
    expect(response.text).toContain('Generate questions with AI');
    expect(response.text).toContain('Edit, finalize, or delete');
    expect(response.text).toContain('Participation history and prizes');
    expect(response.text).toContain('Admin workspace');
    expect(response.text).toContain('data-admin-task-target="ai"');
    expect(response.text).toContain('id="session-controls"');
  });

  it('serves the separate sign-in page', async () => {
    const response = await request(app).get('/demo/sign-in/');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('<title>Sign in | Contest System</title>');
    expect(response.text).toContain('Welcome back');
  });
});
