// WGSL validation with naga (the shader compiler inside Firefox and wgpu), compiled to WebAssembly.
// naga is imported lazily so the other commands still work on an older Node.

const LOCATION = /┌─\s+\S*?:(\d+):(\d+)/;

let nagaPromise;
function loadNaga() {
  nagaPromise ??= import("naga-wasm");
  return nagaPromise;
}

export async function nagaVersion() {
  try {
    return (await loadNaga()).nagaVersion;
  } catch {
    return null;
  }
}

function describe(error) {
  const formatted = typeof error.formatted === "string" ? error.formatted : "";
  const location = LOCATION.exec(formatted);
  const headline = /^error:\s*(.*)$/m.exec(formatted)?.[1] ?? error.message ?? String(error);
  return {
    kind: error.kind ?? "unknown",
    message: headline,
    line: location ? Number(location[1]) : null,
    column: location ? Number(location[2]) : null,
  };
}

/**
 * Validate WGSL source text.
 * @returns {{ ok: boolean, errors: Array<{kind: string, message: string, line: number|null, column: number|null}>, warnings: string[] }}
 */
export async function checkWGSL(source) {
  let naga;
  try {
    naga = await loadNaga();
  } catch (error) {
    throw new Error(
      `The WGSL validator (naga-wasm) could not load: ${error.message}. It needs Node 24.12 or newer; this is Node ${process.versions.node}.`,
    );
  }

  const warnings = [];
  if (!/@(vertex|fragment|compute)\b/.test(source)) {
    warnings.push("No @vertex, @fragment or @compute entry point found. WebGPU needs at least one to build a pipeline.");
  }

  try {
    using module = naga.parseWgsl(source);
    using _info = naga.validate(module);
    return { ok: true, errors: [], warnings };
  } catch (error) {
    if (error?.name !== "NagaError") throw error;
    return { ok: false, errors: [describe(error)], warnings };
  }
}

/** Format a result as `file:line:col: error: message`, with the source line and a caret. */
export function formatCheck(result, source, file = "shader.wgsl") {
  const lines = source.split(/\r?\n/);
  const out = [];
  for (const error of result.errors) {
    const where = error.line ? `${file}:${error.line}:${error.column}` : file;
    out.push(`${where}: error: ${error.message}`);
    if (error.line && lines[error.line - 1] !== undefined) {
      out.push(`  ${String(error.line).padStart(4)} | ${lines[error.line - 1]}`);
      out.push(`       | ${" ".repeat(Math.max(0, error.column - 1))}^`);
    }
  }
  for (const warning of result.warnings) out.push(`${file}: warning: ${warning}`);
  out.push(result.ok ? `${file}: OK, valid WGSL` : `${file}: ${result.errors.length} error${result.errors.length === 1 ? "" : "s"}`);
  return out.join("\n");
}
