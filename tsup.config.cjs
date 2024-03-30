import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  splitting: false,
  sourcemap: true,
  clean: true,
  declaration: true,
  format: ['esm'],
  target: 'node20',
  treeshake: true,
  banner: {
    "js": "import { createRequire } from 'module';const require = createRequire(import.meta.url);", 
  }
});
