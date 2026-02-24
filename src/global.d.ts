/** Minimal Node.js globals so TS can type-check without @types/node when needed. */
declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
}

declare var process: {
  env: NodeJS.ProcessEnv;
};

declare var global: typeof globalThis;
