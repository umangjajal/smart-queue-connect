/// <reference lib="deno.window" />

declare global {
  namespace Deno {
    function serve(handler: (request: Request) => Response | Promise<Response>): void;
    namespace env {
      function get(key: string): string | undefined;
    }
  }
}

export {};
