/** Client-safe flag for showing the engine debug panel. */
export function showEngineDebugUi(): boolean {
  if (process.env.NEXT_PUBLIC_TORNLIFE_DEBUG === "true") return true;
  return process.env.NODE_ENV === "development";
}
