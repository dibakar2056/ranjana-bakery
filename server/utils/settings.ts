import { settingDefinitions, type SettingKey } from '~~/shared/domain/settings'
import type { OtpPolicy } from '~~/shared/domain/otp'

const CACHE_KEY = 'settings:all'

export async function getSettings() {
  const cached = await cacheGet<Record<string, unknown>>(CACHE_KEY)
  if (cached) return cached
  const rows = await prisma.setting.findMany()
  const values: Record<string, unknown> = {}
  for (const key of Object.keys(settingDefinitions) as SettingKey[]) {
    const row = rows.find(item => item.key === key)
    values[key] = row ? row.value : settingDefinitions[key].default
  }
  await cacheSet(CACHE_KEY, values, 60)
  return values
}

export async function setting<T>(key: SettingKey): Promise<T> {
  const values = await getSettings()
  return values[key] as T
}

export async function saveSetting(event: Parameters<typeof getHeader>[0], actorId: string, key: SettingKey, value: unknown) {
  const definition = settingDefinitions[key]
  const parsed = definition.schema.parse(value)
  const current = await prisma.setting.findUnique({ where: { key } })
  const saved = await prisma.setting.upsert({
    where: { key },
    create: { key, group: definition.group, value: parsed as never, updatedBy: actorId },
    update: { value: parsed as never, updatedBy: actorId }
  })
  await cacheDel(CACHE_KEY)
  await writeAudit(event, {
    actorId,
    action: 'SETTING_CHANGED',
    entity: 'setting',
    entityId: key,
    before: current ? { value: current.value } : null,
    after: { value: saved.value }
  })
  return saved
}

export async function otpPolicy(): Promise<OtpPolicy> {
  const values = await getSettings()
  return {
    expiryMinutes: Number(values['otp.expiry_minutes']),
    resendCooldownSeconds: Number(values['otp.resend_cooldown_seconds']),
    maxResendsPerHour: Number(values['otp.max_resends_per_hour']),
    maxDailySends: Number(values['otp.max_daily_sends']),
    maxVerificationAttempts: Number(values['otp.max_verification_attempts']),
    length: Number(values['otp.length'])
  }
}
