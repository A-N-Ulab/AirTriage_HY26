const clampProgress = (value) => Math.min(100, Math.max(0, value))

export function createDemoLoader({
  importDemo,
  container,
  experienceOptions = {},
  onState = () => {},
}) {
  let progress = 0
  let currentLoad = null

  const emit = ({ status, nextProgress = progress, message, error }) => {
    progress = clampProgress(Math.max(progress, Number(nextProgress) || 0))
    onState({ status, progress, message, ...(error ? { error } : {}) })
  }

  const start = () => {
    if (currentLoad) return currentLoad

    emit({ status: 'loading', nextProgress: 8, message: 'Ładowanie strony...' })

    currentLoad = (async () => {
      try {
        const demoModule = await importDemo()
        emit({ status: 'loading', nextProgress: 32, message: 'Przygotowujemy stronę...' })

        let runtimeFailed = false
        const reportRuntimeError = (error) => {
          runtimeFailed = true
          emit({
            status: 'error',
            message: 'Strona niedostępna',
            error: error instanceof Error ? error : new Error(String(error)),
          })
        }

        const createRuntime = demoModule.createExperience ?? demoModule.createDemo
        const controller = await createRuntime({
          ...experienceOptions,
          container,
          onError: reportRuntimeError,
          onProgress: ({ progress: nextProgress, message }) => {
            emit({ status: 'loading', nextProgress, message })
          },
        })

        if (runtimeFailed) {
          controller?.destroy?.()
          return null
        }

        emit({ status: 'ready', nextProgress: 100, message: 'Strona gotowa' })
        return controller
      } catch (error) {
        emit({
          status: 'error',
          message: 'Strona niedostępna',
          error: error instanceof Error ? error : new Error(String(error)),
        })
        return null
      }
    })()

    return currentLoad
  }

  return { start }
}

export function bindRetry(button, reload = () => window.location.reload()) {
  const onRetry = () => reload()
  button.addEventListener('click', onRetry)
  return () => button.removeEventListener('click', onRetry)
}
