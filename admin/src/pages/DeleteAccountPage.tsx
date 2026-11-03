import { FormEvent, useEffect, useState } from 'react'
import { deleteUser, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { auth, db } from '../lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import app from '../lib/firebase'

export function DeleteAccountPage() {
  const [phone, setPhone] = useState('+91')
  const [otp, setOtp] = useState('')
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState('')
  const [recaptcha, setRecaptcha] = useState<RecaptchaVerifier | null>(null)

  useEffect(() => {
    const verifier = new RecaptchaVerifier(auth, 'deletion-recaptcha', { size: 'normal' })
    setRecaptcha(verifier)
    return () => { void verifier.clear() }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      if (!confirmation) {
        if (!recaptcha) throw new Error('Security check is still loading. Try again.')
        const result = await signInWithPhoneNumber(auth, phone.trim(), recaptcha)
        setConfirmation(result)
        setMessage('Enter the verification code sent to your phone.')
        return
      }

      await confirmation.confirm(otp.trim())
      const uid = auth.currentUser?.uid
      const hasProfile = uid ? (await getDoc(doc(db, 'plumbers', uid))).exists() : false
      if (!uid || !hasProfile) {
        if (auth.currentUser) await deleteUser(auth.currentUser)
        throw new Error('This verified phone number is not linked to a Shiv Agency Rewards account.')
      }
      const sendRequest = httpsCallable<void, { status: string }>(getFunctions(app, 'asia-south1'), 'requestAccountDeletion')
      const result = await sendRequest()
      const requestSubmitted = result.data.status === 'pending'
      setSubmitted(requestSubmitted)
      setMessage(requestSubmitted
        ? 'Your request was submitted. Shiv Agency will verify it and contact you before deleting eligible account data.'
        : 'Your request could not be submitted. Please try again.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not submit the request. Please try again.')
      if (confirmation) setConfirmation(null)
      recaptcha?.clear()
      const verifier = new RecaptchaVerifier(auth, 'deletion-recaptcha', { size: 'normal' })
      setRecaptcha(verifier)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <section className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold text-emerald-800">Shiv Agency Rewards</p>
        <h1 className="mt-2 text-2xl font-bold">Request account deletion</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Verify the phone number linked to your account. Any unredeemed points will be forfeited. Shiv Agency will verify your request and resolve pending payouts before deleting your account and eligible personal data. Records required for legal, accounting, fraud-prevention, or dispute purposes may be retained as described in the privacy policy.
        </p>
        {!submitted && <form onSubmit={submit} className="mt-6 space-y-4">
          {!confirmation ? (
            <label className="block text-sm font-medium">Phone number linked to your account
              <input required type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="+91 98765 43210" />
            </label>
          ) : (
            <label className="block text-sm font-medium">Verification code
              <input required inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
          )}
          <div id="deletion-recaptcha" />
          <button disabled={busy} className="w-full rounded-lg bg-emerald-800 px-4 py-3 font-semibold text-white disabled:opacity-50">
            {busy ? 'Please wait…' : confirmation ? 'Verify and submit deletion request' : 'Send verification code'}
          </button>
        </form>}
        {message && <p role="status" className="mt-4 rounded-lg bg-slate-100 p-3 text-sm">{message}</p>}
        <a className="mt-6 inline-block text-sm text-emerald-800 underline" href="/privacy">Privacy policy</a>
      </section>
    </main>
  )
}
