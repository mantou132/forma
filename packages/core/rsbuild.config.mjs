import path from 'node:path';
import { defineConfig } from '@rsbuild/core';
import unpluginGem from 'unplugin-gem/rspack';

const coreSrc = path.resolve(import.meta.dirname, 'src');

/**
 * Shared Rsbuild config for every Forma game: Gem transform for the game and `@forma/core`,
 * `forma-*` elements auto-imported from core; each game writes its own auto-import d.ts (the Wasm plugin only writes inside its project).
 * @param {{ root: string, port: number }} options
 */
export const defineGameConfig = ({ root, port }) =>
  defineConfig(({ command }) => ({
    html: {
      template: './index.html',
      // 内容铺满刘海与 home 指示条区域，安全区由 core 样式的 env(safe-area-inset-*) 处理
      meta: {
        viewport: 'width=device-width, initial-scale=1.0, viewport-fit=cover',
      },
    },
    source: {
      entry: {
        index: './src/main.ts',
      },
    },
    output: {
      distPath: {
        root: 'dist',
      },
    },
    server: {
      host: '0.0.0.0',
      port,
      strictPort: true,
    },
    tools: {
      rspack: {
        target: ['web', 'es2022'],
        plugins: [
          unpluginGem({
            include: [path.resolve(root, 'src'), coreSrc],
            styleMinify: true,
            htmlMinify: true,
            autoImport: {
              extends: 'gem',
              elements: {
                '@forma/core': {
                  'forma-*': '/elements/*',
                },
                [`${path.relative(root, path.resolve(root, 'src/elements'))}`]: {
                  [`${path.basename(root)}-*`]: '/*',
                },
              },
            },
            autoImportDts: true,
            hmr: command !== 'build',
          }),
        ],
      },
    },
  }));
