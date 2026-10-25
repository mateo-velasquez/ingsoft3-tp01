import { expect, test } from '@playwright/test'

// The api has its own address: it is NOT the front's. No trailing slash.
// Its routes are not under /api: /courses, /course, /login…
const API = process.env.API_BASE_URL || 'http://localhost:8080'

// Seed admin from database/load_data.sql (also a teacher, so it can create courses).
const ADMIN = { email: '2214715@ucc.edu.ar', password: 'admin1234' }

// helper: asks for the list and returns it parsed (the api answers null when it is empty)
async function listCourses (request) {
  const r = await request.get(`${API}/courses`)
  expect(r.status()).toBe(200)
  return (await r.json()) ?? []
}

function newCourse (courseName) {
  return {
    course_name: courseName,
    description: 'Created by the integration suite',
    duration: '1 semana',
    init_date: '2027-03-01T00:00:00Z',
    price: 100,
    id_image: 1,
    categories: ['Pastas'],
  }
}

test('el alta guarda el curso en la base de verdad, y el borrado lo saca', async ({ request }) => {
  const courseName = `api ${Date.now()}`                      // unique: does not clash with another run
  const alta = await request.post(`${API}/course`, { data: newCourse(courseName) })
  expect(alta.status()).toBe(201)                             // the api says «created»
  const creado = await alta.json()

  const lista = await listCourses(request)                    // and the DATABASE returns it: not a double
  expect(lista.some(c => c.course_name === courseName)).toBe(true)

  const borrado = await request.delete(`${API}/course/${creado.id}`)
  expect(borrado.status()).toBe(200)                          // this api answers 200 + message on delete

  const despues = await listCourses(request)                  // and the delete, checked
  expect(despues.some(c => c.course_name === courseName)).toBe(false)
})

test('un curso sin nombre lo rechaza la api, y no crea nada', async ({ request }) => {
  const antes = await listCourses(request)

  const alta = await request.post(`${API}/course`, { data: newCourse('') })
  expect(alta.status()).toBe(400)                             // the error contract

  const despues = await listCourses(request)
  expect(despues.length).toBe(antes.length)                   // and nothing was really created
})

test('el login entra con la contraseña correcta y no con una incorrecta', async ({ request }) => {
  // The everyday flow: without login nobody can enroll. The hash it compares against lives in the database.
  const ok = await request.post(`${API}/login`, {
    data: { email: ADMIN.email, userpassword: ADMIN.password },
  })
  expect(ok.status()).toBe(200)
  expect((await ok.json()).token).toBeTruthy()

  const mal = await request.post(`${API}/login`, {
    data: { email: ADMIN.email, userpassword: 'not-the-password' },
  })
  expect(mal.status()).toBe(401)
})
