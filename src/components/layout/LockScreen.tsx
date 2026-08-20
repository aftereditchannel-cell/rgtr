import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../../store/useApp'
import { readLock, verifyPin } from '../../lib/lock'
import { BrandMark } from '../ui/BrandMark'
import { Icon } from '../ui/Primitives'
import { useT } from '../../i18n'
import { isMobile } from '../../lib/mobile'

interface Props {
  onUnlock: () => void
}

export function LockScreen({ onUnlock }: Props) {
  const { t, lang } = useT()
  const accent = useApp(s => s.data.settings.accent)
  const [digits, setDigits] = useState('')
  const [error, setError] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [biometricOk, setBiometricOk] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const len = 4

  // تمرکز روی input مخفی
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80) }, [])

  // بررسی بایومتریک
  useEffect(() => {
    const lock = readLock()
    if (!lock.biometric || !isMobile) return
    void (async () => {
      try {
        const { BiometricAuth, BiometricType } = await import('@aparajita/capacitor-biometric-auth')
        const available = await BiometricAuth.isAvailable()
        if (available && available.hasBiometry) {
          const result = await BiometricAuth.authenticate({
            reason: t('lock.biometricReason'),
            cancelTitle: t('common.cancel'),
            iosPromptTitle: t('lock.biometricTitle'),
            androidTitle: t('lock.biometricTitle'),
            androidSubtitle: t('lock.biometricSubtitle'),
          })
          if (result && result.authenticated) {
            setBiometricOk(true)
            setTimeout(onUnlock, 200)
          }
        }
      } catch { /* بایومتریک در دسترس نیست */ }
    })()
  }, [])

  const submit = useCallback(async (pin: string) => {
    const ok = await verifyPin(pin)
    if (ok) {
      onUnlock()
    } else {
      setError(true)
      setShaking(true)
      setTimeout(() => { setShaking(false); setError(false); setDigits('') }, 600)
    }
  }, [onUnlock])

  const handleChange = (v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, len)
    setDigits(clean)
    setError(false)
    if (clean.length === len) {
      setTimeout(() => void submit(clean), 150)
    }
  }

  const lock = readLock()
  const orgName = useApp.getState().data.settings.orgName || 'NEXUS HQ'

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-hidden"
      style={{ background: 'var(--color-bg)' }}>

      {/* هاله‌ی نوری پس‌زمینه — مشابه تم اصلی */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(500px 400px at 25% 20%, ${accent}18, transparent 60%),
            radial-gradient(400px 350px at 78% 75%, #a855f712, transparent 55%),
            radial-gradient(300px 300px at 50% 50%, #22d3ee08, transparent 50%)
          `,
        }} />

      {/* لایه‌ی شبکه‌ی ظریف */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(128,140,170,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(128,140,170,.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

      <div className={`relative flex flex-col items-center gap-6 px-6 w-full max-w-sm ${shaking ? 'animate-[shakeX_0.4s_ease-in-out]' : ''}`}
        style={{
          animation: shaking ? 'shakeX 0.4s ease-in-out' : undefined,
        }}>

        {/* آیکون برند */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <BrandMark size={56} />
            {/* حلقه‌ی درخشش دور لوگو */}
            <div className="absolute -inset-3 rounded-[26px] pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${accent}15, transparent 70%)`,
              }} />
          </div>
          <div className="text-center mt-1">
            <h1 className="text-[18px] font-semibold tracking-tight">{orgName}</h1>
            <p className="text-[11.5px] text-[var(--color-dim2)] mt-1">{t('lock.subtitle')}</p>
          </div>
        </div>

        {/* نقاط PIN */}
        <div className="flex items-center gap-4 my-2">
          {Array.from({ length: len }).map((_, i) => (
            <div key={i}
              className={`w-3 h-3 rounded-full transition-all duration-200
                ${i < digits.length
                  ? error
                    ? 'bg-red-400 scale-110'
                    : 'scale-110'
                  : 'bg-[var(--color-line2)]'
                }`}
              style={i < digits.length && !error
                ? { background: accent, boxShadow: `0 0 10px ${accent}50` }
                : undefined
              } />
          ))}
        </div>

        {/* input مخفی */}
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={len}
          autoFocus
          value={digits}
          onChange={e => handleChange(e.target.value)}
          className="absolute opacity-0 w-px h-px pointer-events-none"
          aria-label="PIN"
        />

        {/* پیام خطا */}
        <div className="h-5 flex items-center">
          {error && (
            <span className="text-[12px] text-red-400 flex items-center gap-1.5 anim">
              <Icon name="AlertTriangle" size={13} />
              {t('lock.wrongPin')}
            </span>
          )}
        </div>

        {/* دکمه‌ی بایومتریک */}
        {lock.biometric && (
          <button
            onClick={async () => {
              try {
                const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
                const available = await BiometricAuth.isAvailable()
                if (available?.hasBiometry) {
                  const result = await BiometricAuth.authenticate({
                    reason: t('lock.biometricReason'),
                    cancelTitle: t('common.cancel'),
                    iosPromptTitle: t('lock.biometricTitle'),
                    androidTitle: t('lock.biometricTitle'),
                    androidSubtitle: t('lock.biometricSubtitle'),
                  })
                  if (result?.authenticated) {
                    onUnlock()
                  }
                }
              } catch { /* ناکام */ }
            }}
            className="w-14 h-14 rounded-2xl border border-[var(--color-line2)] bg-[var(--color-panel)] grid place-items-center transition-all hover:border-[var(--color-dim2)] active:scale-95"
            title={t('lock.biometric')}>
            <Icon name="Fingerprint" size={26} className="text-[var(--color-dim)]" />
          </button>
        )}

        {/* راهنمای عددی */}
        <p className="text-[10.5px] text-[var(--color-dim2)] text-center leading-relaxed">
          {t('lock.hint')}
        </p>
      </div>

      {/* نسخه در پایین */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <span className="text-[10px] text-[var(--color-dim2)]/50 ltr tracking-wider">V1.1.1</span>
      </div>

      <style>{`
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(7px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(5px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  )
}
