import { writable } from 'svelte/store'
import { Element } from './types'

export const active_category = writable<string | null>(null)

export const active_element = writable<Element | null>(null)
