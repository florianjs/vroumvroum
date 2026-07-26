import type { H3Event } from 'h3'
import type { D1Database } from '@cloudflare/workers-types'

/** Access the D1 binding provided by the Cloudflare platform. */
export function getDB(event: H3Event): D1Database {
  const db = event.context.cloudflare?.env?.DB as D1Database | undefined
  if (!db) {
    throw createError({ statusCode: 500, message: 'D1 binding "DB" unavailable' })
  }
  return db
}
