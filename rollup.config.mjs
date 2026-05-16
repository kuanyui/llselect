// @ts-check

import typescript from '@rollup/plugin-typescript'

const tsPlugin = typescript({
  tsconfig: './tsconfig.json',
  compilerOptions: {
    declaration: false,
    declarationMap: false,
    sourceMap: true
  }
})

/**
* https://rollupjs.org/command-line-interface/#config-intellisense
* @type {import('rollup').RollupOptions}
*/
const options = {
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.mjs', format: 'es', sourcemap: true },
    { file: 'dist/index.cjs', format: 'cjs', exports: 'named', sourcemap: true },
    {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'llselect',
      exports: 'named',
      sourcemap: true
    }
  ],
  plugins: [tsPlugin]
}

export default options