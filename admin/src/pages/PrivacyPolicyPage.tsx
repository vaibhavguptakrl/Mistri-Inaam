import type { ReactNode } from 'react'

export function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <article className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold text-emerald-800">Shiv Agency Rewards</p>
        <h1 className="mt-2 text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: 3 November 2026</p>
        <p className="mt-6 leading-7 text-slate-700">
          Shiv Agency (“we”) operates the Shiv Agency Rewards app for plumbers and contractors. This policy explains what information the app handles, why it is used, when it is shared, and how to request deletion.
        </p>

        <Section title="Information we collect">
          <ul className="list-disc space-y-2 pl-5">
            <li>Account and contact details: name, phone number, email address (if supplied), WhatsApp number, address, language preference and account identifiers.</li>
            <li>Identity and verification information: PAN number and image, Aadhaar last four digits and image, and a selfie submitted for account verification.</li>
            <li>Rewards and transaction information: points balance, purchase and bill details, points ledger, referrals, reward selections, redemption requests and payout status.</li>
            <li>Payment details needed for a payout, such as a UPI ID, are used to process and support that payout.</li>
            <li>App operation information, such as notification token and basic service or device diagnostics provided by Firebase and Android.</li>
          </ul>
        </Section>
        <Section title="How we use information">
          <p>We use it to create and secure accounts, verify registrations, award and reconcile points, prevent fraud, fulfil reward and UPI payout requests, send requested service updates, provide support, and meet legal or accounting obligations.</p>
        </Section>
        <Section title="Sharing and service providers">
          <p>We do not sell personal information. Firebase and Google services provide authentication, database, file storage, notifications and app hosting. RazorpayX receives payout information needed to execute a UPI transfer. Information may also be disclosed when required by law or to resolve a dispute, prevent fraud, or protect the service and its users.</p>
        </Section>
        <Section title="Storage and security">
          <p>Account records and uploaded documents are stored using Firebase services. KYC files are stored separately from public reward content and access is controlled by account and staff permissions. No online service can guarantee absolute security; contact us promptly if you suspect unauthorised access.</p>
        </Section>
        <Section title="Retention and deletion">
          <p>You can request deletion inside the app under Settings → Privacy and data, or on our <a className="text-emerald-800 underline" href="/delete-account">account deletion page</a>. We verify the phone number linked to the account. We delete account and associated personal data that we no longer need, including uploaded KYC files. Unredeemed points are forfeited; a pending payout must finish before deletion is processed. We may retain limited transaction, payout, tax, fraud-prevention or dispute records when required by law or necessary to resolve an outstanding matter; retained records are restricted and kept only as long as needed for that purpose.</p>
        </Section>
        <Section title="Your choices and contact">
          <p>You may contact Shiv Agency about your information or a deletion request through the phone or WhatsApp support options shown in the app’s Settings. Shiv Agency is based on Hindaun Road, Karauli, Rajasthan, India. The support contact shown in the app is the current contact channel for privacy questions.</p>
        </Section>
      </article>
    </main>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-2 leading-7 text-slate-700">{children}</div>
    </section>
  )
}

