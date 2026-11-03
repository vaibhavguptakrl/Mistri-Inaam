# Activate OTP-free signup email notifications

The Android signup flow creates a Firebase anonymous account, uploads the required front-camera selfie, and saves the application with `kycStatus: pending` and `registrationSource: mobile_signup`. It does not request Google sign-in or an OTP. The admin Plumbers page shows the submitted email, address, and selfie. New signups remain on an application status screen until an admin approves them.

The email sender is implemented as a Firestore-triggered Firebase Cloud Function. It sends through the Gmail SMTP account `vaibhav.guptakrl@gmail.com` and emails the owner admin address stored in `admins/{uid}.email`. Configure and deploy it from a machine authenticated to the correct Firebase project:

1. In Firebase Console, enable **Authentication → Sign-in method → Anonymous**.
2. Use a Firebase project on the **Blaze** plan and confirm its Firestore database region. The function currently deploys in `asia-south1`; change `region` in `functions/index.js` to match the database region before deploying if needed. It targets Node.js 22 because Node.js 20 was decommissioned for Firebase Functions on October 30, 2026.
3. In the Gmail account's Google Account Security settings, create an **App Password** for the sender account. This requires 2-Step Verification. Do this yourself; do not share your Google password or App Password in chat.
4. Complete the Google Cloud account verification if prompted, then enable the **Secret Manager API** for the Firebase project.
5. From the repository root, run `firebase functions:secrets:set GMAIL_APP_PASSWORD` and enter the App Password at the secure prompt. Remove spaces from Google's displayed App Password. Do not put the credential in source files or chat.
6. Deploy with `firebase deploy --only functions`. The sender address defaults to `vaibhav.guptakrl@gmail.com`.
7. Confirm the owner admin is signed in to the Admin app so `admins/{uid}` exists with `role: owner` and a valid `email`.

Firebase project `sa-mistri-inaam` is configured and the Firebase CLI is signed in. The Gmail App Password is stored in Secret Manager (never in source control), and `notifyAdminOfNewRegistration` is deployed in `asia-south1` on Node.js 22. Its Firestore create trigger filters for `registrationSource: mobile_signup` and sends new application details to the owner admin email. No test signup or test email was submitted; verify delivery during a real signup and check the function logs if Gmail rejects the message.
