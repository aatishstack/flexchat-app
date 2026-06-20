type StartupLogLevel = "info" | "error";

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack ?? `${error.name}: ${error.message}`,
    };
  }

  const message = String(error);

  return {
    message,
    stack: message,
  };
}

function writeStartupLog(
  level: StartupLogLevel,
  stage: string,
  message: string,
  stack?: string,
) {
  const output = JSON.stringify({
    level,
    stage,
    message,
    ...(stack ? { stack } : {}),
  });

  if (level === "error") {
    console.error(output);
    return;
  }

  console.info(output);
}

export function logStartupStep(stage: string, message: string) {
  writeStartupLog("info", stage, message);
}

export function logFatalStartupError(stage: string, error: unknown) {
  const { message, stack } = getErrorDetails(error);

  writeStartupLog("error", stage, message, stack);
}
