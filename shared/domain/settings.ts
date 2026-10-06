import { z } from 'zod'

const bool = z.boolean()
const text = (max = 200) => z.string().trim().min(1).max(max)

export const settingDefinitions = {
  'store.name': { group: 'STORE', security: false, schema: text(120), default: 'Ranjana Bakery & Cafe' },
  'store.phone': { group: 'STORE', security: false, schema: text(40), default: '+977-1-5551234' },
  'store.email': { group: 'STORE', security: false, schema: z.string().trim().email(), default: 'hello@ranjanabakery.local' },
  'store.address': { group: 'STORE', security: false, schema: text(300), default: 'Lazimpat, Kathmandu' },
  'store.opening_time': { group: 'STORE', security: false, schema: z.string().regex(/^\d{2}:\d{2}$/), default: '08:00' },
  'store.closing_time': { group: 'STORE', security: false, schema: z.string().regex(/^\d{2}:\d{2}$/), default: '20:00' },
  'store.currency': { group: 'STORE', security: false, schema: z.string().regex(/^[A-Z]{3}$/), default: 'NPR' },
  'store.timezone': { group: 'STORE', security: false, schema: text(80), default: 'Asia/Kathmandu' },
  'order.minimum_amount': { group: 'ORDER', security: false, schema: z.number().min(0).max(100000), default: 0 },
  'order.max_advance_days': { group: 'ORDER', security: false, schema: z.number().int().min(1).max(90), default: 30 },
  'delivery.fee': { group: 'DELIVERY', security: false, schema: z.number().min(0).max(10000), default: 100 },
  'delivery.free_over': { group: 'DELIVERY', security: false, schema: z.number().min(0).max(1000000), default: 3000 },
  'delivery.enabled': { group: 'DELIVERY', security: false, schema: bool, default: true },
  'payment.cash_enabled': { group: 'PAYMENT', security: false, schema: bool, default: true },
  'payment.card_enabled': { group: 'PAYMENT', security: false, schema: bool, default: true },
  'payment.cod_enabled': { group: 'PAYMENT', security: false, schema: bool, default: true },
  'email.from_name': { group: 'EMAIL', security: false, schema: text(80), default: 'Ranjana Bakery & Cafe' },
  'security.password_min_length': { group: 'SECURITY', security: true, schema: z.number().int().min(12).max(128), default: 12 },
  'security.password_require_upper': { group: 'SECURITY', security: true, schema: bool, default: true },
  'security.password_require_lower': { group: 'SECURITY', security: true, schema: bool, default: true },
  'security.password_require_number': { group: 'SECURITY', security: true, schema: bool, default: true },
  'security.password_require_special': { group: 'SECURITY', security: true, schema: bool, default: true },
  'security.password_history': { group: 'SECURITY', security: true, schema: z.number().int().min(1).max(20), default: 5 },
  'security.max_login_attempts': { group: 'SECURITY', security: true, schema: z.number().int().min(3).max(20), default: 5 },
  'security.lockout_minutes': { group: 'SECURITY', security: true, schema: z.number().int().min(5).max(1440), default: 15 },
  'security.session_hours': { group: 'SECURITY', security: true, schema: z.number().int().min(1).max(24), default: 12 },
  'otp.expiry_minutes': { group: 'OTP', security: true, schema: z.number().int().min(1).max(15), default: 10 },
  'otp.resend_cooldown_seconds': { group: 'OTP', security: true, schema: z.number().int().min(30).max(600), default: 60 },
  'otp.max_resends_per_hour': { group: 'OTP', security: true, schema: z.number().int().min(1).max(10), default: 3 },
  'otp.max_daily_sends': { group: 'OTP', security: true, schema: z.number().int().min(1).max(20), default: 8 },
  'otp.max_verification_attempts': { group: 'OTP', security: true, schema: z.number().int().min(3).max(10), default: 5 },
  'otp.length': { group: 'OTP', security: true, schema: z.number().int().min(6).max(8), default: 6 },
  'loyalty.enabled': { group: 'LOYALTY', security: false, schema: bool, default: true },
  'loyalty.spend_per_point': { group: 'LOYALTY', security: false, schema: z.number().min(1).max(100000), default: 100 },
  'loyalty.point_value': { group: 'LOYALTY', security: false, schema: z.number().min(0).max(1000), default: 1 },
  'loyalty.expiry_days': { group: 'LOYALTY', security: false, schema: z.number().int().min(30).max(3650), default: 365 },
  'tax.enabled': { group: 'TAX', security: false, schema: bool, default: true },
  'tax.rate_percent': { group: 'TAX', security: false, schema: z.number().min(0).max(28), default: 13 },
  'tax.inclusive': { group: 'TAX', security: false, schema: bool, default: false },
  'notifications.order_email': { group: 'NOTIFICATIONS', security: false, schema: bool, default: true },
  'notifications.low_stock_email': { group: 'NOTIFICATIONS', security: false, schema: bool, default: true },
  'modules.inventory': { group: 'MODULES', security: false, schema: bool, default: true },
  'modules.loyalty': { group: 'MODULES', security: false, schema: bool, default: true },
  'modules.promotions': { group: 'MODULES', security: false, schema: bool, default: true },
  'modules.custom_cakes': { group: 'MODULES', security: false, schema: bool, default: true },
  'modules.reviews': { group: 'MODULES', security: false, schema: bool, default: true }
} as const

export type SettingKey = keyof typeof settingDefinitions

export function parseSetting(key: SettingKey, value: unknown) {
  return settingDefinitions[key].schema.parse(value)
}
