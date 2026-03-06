// Client instrumentation is lazily loaded so Lighthouse and local checks can
// run without paying the Sentry client bundle cost.

type RouterTransitionHandler = (...args: any[]) => void;

let onTransition: RouterTransitionHandler = () => {};

const monitoringDisabled = process.env.NEXT_PUBLIC_DISABLE_MONITORING === '1';
const canInitSentry =
  process.env.NODE_ENV === 'production' &&
  !monitoringDisabled &&
  Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

if (canInitSentry) {
  void import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      enabled: true,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
      release: process.env.NEXT_PUBLIC_APP_VERSION,
      environment: process.env.NODE_ENV,
    });

    onTransition = Sentry.captureRouterTransitionStart;
  });
}

export const onRouterTransitionStart: RouterTransitionHandler = (...args) => {
  onTransition(...args);
};
