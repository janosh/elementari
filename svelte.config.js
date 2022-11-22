import adapter from '@sveltejs/adapter-static'
import { mdsvex } from 'mdsvex'
import preprocess from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
export default {
  extensions: [`.svelte`, `.svx`, `.md`],

  preprocess: [preprocess(), mdsvex({ extensions: [`.svx`, `.md`] })],

  kit: {
    adapter: adapter(),

    paths: {
      base: process.env?.CI ? `/periodic-table` : ``,
    },
  },
}

console.log(`process.env`, process.env)
