export default defineEventHandler(async (event) => {
  const { email, password } = await readBody<{ email?: string, password?: string }>(event)
  const config = useRuntimeConfig(event)

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'Email and password are required' })
  }

  if (email !== config.demoEmail || password !== config.demoPassword) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
  }

  await setUserSession(event, {
    user: {
      name: 'Fleet Dispatcher',
      email: config.demoEmail,
    },
    loggedInAt: Date.now(),
  })

  return { success: true }
})
