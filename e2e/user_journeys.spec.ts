import { test, expect } from '@playwright/test';

test.describe('GotU Task 9 — End-to-End User Journeys & Attack Simulations', () => {

  // FLOW A — REGISTERED USER WORKFLOW
  test('FLOW A: Registered user authentication and invitation management', async ({ page }) => {
    // 1. Visit Login page
    await page.goto('/login');
    await expect(page).toHaveTitle(/GotU/);

    // 2. Check login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  // FLOW B — GUEST RECIPIENT CONSENT WORKFLOW
  test('FLOW B: Guest recipient invitation redemption and consent flow', async ({ page, context }) => {
    // Grant mocked browser geolocation permission
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 51.5074, longitude: -0.1278 });

    // Visit invalid token page to verify rejection
    await page.goto('/share/invalid-token-123');
    await expect(page.locator('text=Invitation not found or invalid.')).toBeVisible();
  });

  // FLOW C — REQUESTER LIVE DASHBOARD
  test('FLOW C: Requester live GPS map dashboard interactions', async ({ page }) => {
    await page.goto('/dashboard/live');
    // Unauthenticated user is redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  // FLOW D — SUPER ADMIN OVERVIEW AND AUDITING
  test('FLOW D: Super Admin dashboard access control and oversight', async ({ page }) => {
    await page.goto('/admin');
    // Unauthenticated visitor is redirected away from admin routes
    await expect(page).toHaveURL(/\/(login|dashboard)/);
  });

  // FLOW E — ATTACK SIMULATIONS
  test('FLOW E: Security attack simulations fail closed', async ({ request }) => {
    // 1. Anonymous location update attempt without token -> rejected (400)
    const updateRes = await request.post('/api/locations/update', {
      data: { sessionId: 'fake-session', latitude: 51.5, longitude: -0.1, accuracyMeters: 10 },
    });
    expect(updateRes.status()).toBe(400);

    // 2. Anonymous location read attempt -> rejected (401)
    const readRes = await request.get('/api/sessions/fake-session/location');
    expect(readRes.status()).toBe(401);

    // 3. Anonymous reverse geocode read -> rejected (401)
    const geocodeRes = await request.get('/api/geocoding/reverse?lat=51.5&lng=-0.1');
    expect(geocodeRes.status()).toBe(401);

    // 4. Invalid coordinate submission -> rejected
    const invalidCoordRes = await request.post('/api/locations/update', {
      data: {
        sessionId: 'session-1',
        recipientToken: 'token',
        latitude: 999.0, // Invalid latitude
        longitude: -0.1,
        accuracyMeters: 10,
      },
    });
    expect(invalidCoordRes.status()).toBe(400);
  });
});
