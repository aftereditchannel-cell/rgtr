/**
 * پل به حسگر اثر انگشت / چهره در نسخه‌ی اندروید
 * (پلاگین @aparajita/capacitor-biometric-auth).
 *
 * همه‌ی importها تنبل هستند تا باندل وب سنگین‌تر نشود و
 * روی هر پلتفرم دیگری (مرورگر/ویندوز) بدون خطا به false برگردد.
 */
import { isMobile, isAndroid } from './mobile'

/** آیا اثر انگشت/بیومتریک روی این دستگاه در دسترس است؟ */
export async function biometricAvailable(): Promise<boolean> {
  if (!isMobile || !isAndroid) return false
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
    const res = await BiometricAuth.checkBiometry()
    return res.isAvailable === true
  } catch {
    return false
  }
}

/**
 * نمایش پنجره‌ی بومی احراز هویت.
 * در موفقیت true و در لغو/خطا false برمی‌گرداند.
 */
export async function biometricVerify(reason: string): Promise<boolean> {
  if (!isMobile || !isAndroid) return false
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'لغو',
      androidTitle: 'NEXUS HQ',
      androidSubtitle: reason,
      allowDeviceCredential: false,
    })
    return true
  } catch {
    return false
  }
}
