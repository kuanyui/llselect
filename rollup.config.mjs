// @ts-check

import { readdirSync, mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'

const THEMES_SRC = 'src/themes'
const THEMES_DEST = 'dist/themes'

const tsPlugin = typescript({
  tsconfig: './tsconfig.json',
  compilerOptions: {
    declaration: false,
    declarationMap: false,
    sourceMap: true
  }
})

/**
 * Copy src/themes/*.css into dist/themes after every (re)build, and register
 * the theme files as watch inputs so `rollup -w` rebuilds when one changes.
 * This folds the standalone `build:themes` npm step into the bundle so a
 * single `npm run watch` keeps both the JS bundle and the CSS themes fresh.
 * @returns {import('rollup').Plugin}
 */
function copyThemes() {
  const themeFiles = () => readdirSync(THEMES_SRC).filter(f => f.endsWith('.css'))
  return {
    name: 'copy-themes',
    buildStart() {
      for (const f of themeFiles()) {
        this.addWatchFile(join(THEMES_SRC, f))
      }
    },
    writeBundle() {
      mkdirSync(THEMES_DEST, { recursive: true })
      for (const f of themeFiles()) {
        copyFileSync(join(THEMES_SRC, f), join(THEMES_DEST, f))
      }
    }
  }
}

/**
* Two independent bundles (config array): the library, and the language packs
* (`@llselect/core/i18n`). i18n never imports base.ts, so importing
* a pack never drags in the library - and vice versa the main bundle carries
* only the English defaults.
* https://rollupjs.org/command-line-interface/#config-intellisense
* @type {import('rollup').RollupOptions[]}
*/
const options = [
  {
    input: 'src/index.ts',
    output: [
      { file: 'dist/index.mjs', format: 'es', sourcemap: true },
      { file: 'dist/index.cjs', format: 'cjs', exports: 'named', sourcemap: true },
      {
        // UMD is the direct-in-browser / unpkg build, so it ships minified +
        // mangled (terser as an output plugin, main/cjs stay readable for
        // bundler consumers). Keeps the CDN size honest against other libraries.
        file: 'dist/index.umd.js',
        format: 'umd',
        name: 'llselect',
        exports: 'named',
        sourcemap: true,
        plugins: [terser()]
      }
    ],
    plugins: [tsPlugin, copyThemes()]
  },
  {
    input: 'src/i18n.ts',
    output: [
      { file: 'dist/i18n.mjs', format: 'es', sourcemap: true },
      { file: 'dist/i18n.cjs', format: 'cjs', exports: 'named', sourcemap: true },
      {
        file: 'dist/i18n.umd.js',
        format: 'umd',
        name: 'llselectI18n',
        exports: 'named',
        sourcemap: true,
        plugins: [terser()]
      }
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        compilerOptions: { declaration: false, declarationMap: false, sourceMap: true }
      })
    ]
  }
]

export default options