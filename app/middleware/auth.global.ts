export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, ready } = useUserSession()

  if (!ready.value) return

  if (!loggedIn.value && to.path !== '/login') {
    return navigateTo('/login')
  }
  if (loggedIn.value && to.path === '/login') {
    return navigateTo('/')
  }
})
