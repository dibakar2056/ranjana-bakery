import { z } from 'zod'

const schema = z.object({
  purpose: z.enum(['ACTIVATION', 'PASSWORD_CHANGE', 'PASSWORD_RESET'])
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readValid(event, schema)
    const session = body.purpose === 'ACTIVATION' ? await requireSetupUser(event) : await requireUser(event)
    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id } })
    await issueOtp(event, user, body.purpose)
    return ok({ sent: true })
  } catch (error) {
    publicError(error)
  }
})
