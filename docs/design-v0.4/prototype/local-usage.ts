// The design study runs the actual optimizer locally; it records no usage in the cloud.
export async function startForgeRun(_input: unknown): Promise<number | null> {
  return null;
}
export async function finishForgeRun(
  _run: Promise<number | null> | null,
  _result: unknown,
): Promise<void> {}
// Cloud selection stays empty in the isolated study; encoded local comparison links work normally.
export async function fetchMyBuilds() {
  return { data: [], error: null };
}
export async function fetchBuildById() {
  return {
    data: null,
    error: "La nube no está conectada en el estudio local.",
  };
}
