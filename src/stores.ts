import { writable } from 'svelte/store'

export const active_category = writable<string | null>(null)
