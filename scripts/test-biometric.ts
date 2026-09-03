import {
  BiometricAuth,
  BiometryType,
} from '@aparajita/capacitor-biometric-auth'
import { getBiometricStatus, tryBiometricUnlock } from '../src/lib/lock'

let failures = 0
function assert(name: string, condition: boolean, extra = '') {
  if (condition) console.log('  ✓', name)
  else { failures++; console.log('  ✗', name, extra) }
}

console.log('ANDROID BIOMETRIC CONTRACT')
await BiometricAuth.setBiometryType(BiometryType.fingerprintAuthentication)
await BiometricAuth.setDeviceIsSecure(true)
await BiometricAuth.setBiometryIsEnrolled(false)
let status = await getBiometricStatus()
assert('unenrolled fingerprint is detected with a useful code', !status.available && status.code === 'biometryNotEnrolled', status.code)

await BiometricAuth.setBiometryIsEnrolled(true)
status = await getBiometricStatus()
assert('enrolled fingerprint is available', status.available)
assert('fingerprint type is reported', status.type === BiometryType.fingerprintAuthentication, String(status.type))
assert('device screen lock is detected', status.deviceSecure)

const previousConfirm = globalThis.confirm
globalThis.confirm = () => true
assert('native biometric success unlocks the app', await tryBiometricUnlock('NEXUS HQ biometric test'))
globalThis.confirm = () => false
assert('cancelled biometric prompt never unlocks the app', !(await tryBiometricUnlock('NEXUS HQ biometric test')))
globalThis.confirm = previousConfirm

console.log(failures ? `\n❌ BIOMETRIC TEST FAILED — ${failures}` : '\n✅ ANDROID BIOMETRIC CONTRACT PASSED')
process.exit(failures ? 1 : 0)
