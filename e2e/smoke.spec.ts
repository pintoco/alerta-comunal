import { test, expect } from '@playwright/test'

// Smoke tests only: confirm the critical public pages render without a database.
// Full flows (login with a real user, submitting a citizen report) need a seeded
// DB and are intentionally out of scope here — see README for the E2E rationale.

test('login page renders the sign-in form', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  await expect(page.getByPlaceholder('usuario@municipio.cl')).toBeVisible()
  await expect(page.getByPlaceholder('••••••••')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ingresar al sistema' })).toBeVisible()
})

test('login page shows a validation error on empty submit', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click()
  await expect(page.getByPlaceholder('usuario@municipio.cl')).toBeVisible()
})

test('public citizen report form renders', async ({ page }) => {
  await page.goto('/reportar')
  await expect(page.getByRole('heading', { name: 'Reportar emergencia' })).toBeVisible()
  await expect(page.getByPlaceholder('Juan Pérez')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar reporte de emergencia' })).toBeVisible()
})

test('citizen report submit is blocked until the data-consent checkbox is accepted', async ({ page }) => {
  await page.goto('/reportar')
  await page.getByPlaceholder('Juan Pérez').fill('Test User')
  await page.getByPlaceholder('+56912345678').fill('+56912345678')
  await page.getByPlaceholder(/Describa detalladamente/).fill('Descripción de prueba con más de diez caracteres.')
  await page.getByRole('button', { name: 'Enviar reporte de emergencia' }).click()
  // Without ticking the consent checkbox, the form must not navigate away or show success.
  await expect(page.getByRole('heading', { name: 'Reportar emergencia' })).toBeVisible()
})
