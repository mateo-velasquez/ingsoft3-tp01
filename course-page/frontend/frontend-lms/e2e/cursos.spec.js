import { expect, test } from '@playwright/test'

// Seed admin from database/load_data.sql: it sees the admin panel, where courses are created and deleted.
const ADMIN = { email: '2214715@ucc.edu.ar', password: 'admin1234' }

// Logs in like a person does; the «Salir» button only exists with a session.
async function login (page, password = ADMIN.password) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Contrasenia').fill(password)
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click()
}

test('crear un curso lo muestra en la lista, y eliminarlo lo saca', async ({ page }) => {
  const courseName = `e2e ${Date.now()}`                        // unique: does not clash with another run
  await login(page)
  await page.getByRole('link', { name: 'Admin' }).click()
  await page.getByRole('button', { name: 'Crear Nuevo Curso' }).click()

  await page.getByLabel('Nombre del Curso').fill(courseName)
  await page.getByLabel('Descripción').fill('Created by the e2e suite')
  await page.getByLabel('Precio').fill('100')
  await page.getByLabel('Duración').fill('1 semana')
  await page.getByLabel('Fecha de Inicio').fill('2027-03-01')
  await page.getByRole('button', { name: 'Crear Curso', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Curso creado exitosamente')

  // the course this test created is listed, no sleeps
  await expect(page.getByRole('heading', { name: courseName })).toBeVisible()

  page.once('dialog', dialog => dialog.accept())                // «¿Estás seguro…?»
  await page.getByRole('button', { name: `Eliminar ${courseName}` }).click()
  await expect(page.getByRole('alert')).toContainText('Curso eliminado exitosamente')
  await expect(page.getByText(courseName)).toHaveCount(0)       // and the delete, checked
})

test('una contraseña incorrecta muestra el error y no inicia sesión', async ({ page }) => {
  await login(page, 'not-the-password')
  await expect(page.getByRole('alert')).toBeVisible()           // the user sees the error…
  await expect(page).toHaveURL(/\/login$/)                       // …stays on the login…
  await expect(page.getByRole('button', { name: 'Salir' })).toHaveCount(0)   // …and no session was created
})

test('un alumno se inscribe a un curso y lo ve confirmado', async ({ page, request }) => {
  // The everyday flow. Its course is created through the front's /api proxy (the real api, no mock)
  // so the test does not depend on what is already in QA, and is deleted at the end.
  const courseName = `e2e ${Date.now()}`
  const alta = await request.post('/api/course', {
    data: {
      course_name: courseName,
      description: 'Created by the e2e suite',
      duration: '1 semana',
      init_date: '2027-03-01T00:00:00Z',
      price: 100,
      id_image: 1,
      categories: ['Pastas'],
    },
  })
  expect(alta.status()).toBe(201)
  const { id } = await alta.json()

  try {
    await login(page)
    await page.getByRole('button', { name: `Inscribirse en ${courseName}` }).click()
    await expect(page.getByRole('alert')).toContainText(`Te has inscrito exitosamente en ${courseName}`)
    await expect(page.getByRole('button', { name: `Inscribirse en ${courseName}` })).toHaveCount(0)
  } finally {
    // the course goes, and its subscription with it (ON DELETE CASCADE)
    const borrado = await request.delete(`/api/course/${id}`)
    expect(borrado.status()).toBe(200)
    const lista = (await (await request.get('/api/courses')).json()) ?? []
    expect(lista.some(c => c.course_name === courseName)).toBe(false)
  }
})
