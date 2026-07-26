export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.config.errorHandler = (error, instance, info) => {
    const route = nuxtApp.$router?.currentRoute.value.fullPath
    const component = instance?.$options.name || info
    const errorObject = error instanceof Error ? error : new Error(String(error))

    void $fetch('/api/observability/client-error', {
      method: 'POST',
      body: {
        message: errorObject.message,
        stack: errorObject.stack,
        route,
        component,
      },
    }).catch(() => null)
  }
})
