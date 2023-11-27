import { toText, toTransformStream } from "@std/streams";

export function processTransform(proc: Deno.ChildProcess) {
  return toTransformStream(async function* tranform(stream) {
    stream.pipeTo(proc.stdin);
    yield* proc.stdout.values();

    const { success, code } = await proc.status;

    if (!success) {
      const errOutput = await toText(proc.stderr);
      console.error(errOutput);
      throw new Error(`Process exited with code ${code}`);
    }
  });
}

export function formatCode(code: string) {
  const proc = new Deno.Command(Deno.execPath(), {
    args: ["fmt", "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });

  const sub = proc.spawn();

  return ReadableStream.from([code])
    .pipeThrough(new TextEncoderStream())
    .pipeThrough(processTransform(sub));
}
