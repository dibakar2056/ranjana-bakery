import { z } from 'zod'

const schema = z.object({
  username: z.string().trim().min(3).max(40),
  password: z.string().min(1).max(200)
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readValid(event, schema)
    return ok(await loginWithPassword(event, body.username, body.password))
  } catch (error) {
    publicError(error)
  }
})
