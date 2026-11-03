# Firebase production audit for launch step 4

**Project configured in Android:** `sa-mistri-inaam`  
**Android package:** `com.shivagency.rewards`  
**Status:** Firebase Console access confirmed for project `mistri inaam` / `sa-mistri-inaam`. Firestore production rules inspected read-only. Play signing and Play-installed authentication remain unverified.

## Findings from the repository

### Critical: authenticated members can read all plumber profiles


Confirmed in the live Firestore Rules editor for the `(default)` database in `asia-south1`: `allow read: if isAuthenticated() || isAdmin();` for `/plumbers/{plumberId}`. That allows any signed-in plumber to read every profile document, not just their own. The profile model includes name, phone, email, address, UPI/KYC fields and KYC image URLs. Firestore rules cannot hide selected fields from a document read. The leaderboard and referral screens currently query the full `plumbers` collection, so this should be changed together with those features: move leaderboard-safe fields into a separate public projection and use a trusted server function or a constrained server query for referrals. Until then, treat this as a launch-blocking exposure.

### Critical: demo UID exceptions bypass authentication

The live profile creation rule includes `(isUser(plumberId) || plumberId == 'demo_plumber_99999')`; checked-in transaction and redemption rules also include demo UID exceptions. These allow operations for `demo_plumber_99999` without requiring an authenticated matching UID in those paths. This combines with the fixed demo login in `LoginScreen.kt`; remove the production demo bypass and all demo-specific rule exceptions before launch.

### KYC Storage reads are not staff-only

`storage.rules` permits reads by admins **or the authenticated plumber who owns the UID path**. Uploads are restricted to the owner's path and images under 10 MB, while only admins can delete. If the intended policy is that only authorized staff can view KYC, change reads to admin-only and ensure the app does not depend on users downloading their KYC files after upload. Update the privacy policy to match the final behavior.

### Admin checks

Firestore `isAdmin()` grants access when the caller has an `admins/{uid}` document, without checking that document's role. `isOwner()` does check for the owner role. This may be intentional for staff, but access must be tested with ordinary users and staff accounts; tighten the predicate if every admin document is not an authorized staff account.

## Production Console checks still required

1. In Firebase Console, confirm the selected production project is `sa-mistri-inaam`, with Phone provider enabled and the intended SMS region policy and quota settings.
2. Confirm the Android Firebase app package is `com.shivagency.rewards`; record the SHA-1 and SHA-256 fingerprints for the **Play App Signing certificate** in Play Console and add them to this Firebase Android app. Also add the upload certificate fingerprints if sideloaded/internal testing needs them.
3. Confirm Firestore is in production mode and deploy only reviewed Firestore rules; inspect Storage bucket and rules in the live project. Checked-in rules do not prove what is deployed.
4. Confirm only intended owner/staff accounts exist in `admins`, and verify access from a member account and a staff account.
5. Once Step 1 yields a signed bundle and Play App Signing certificate is available, install the Play internal-test build and exercise registration OTP, profile creation, KYC upload, member reads, and staff KYC review.

## Why the step remains pending

The Firebase project and Firestore Rules screen were inspected, but the live rules need a safe redesign before any deployment. Phone provider enablement and the India SMS setting were reported by the owner as enabled/selected, but weren’t independently inspected. No Play App Signing certificate is available yet because the signed release bundle and app record are not ready. Production Storage rules and Play-installed OTP/KYC flows still need verification. No Firebase production settings or rules were changed by this audit.

## Prepared local remediation

- `firestore.rules` now limits plumber profile reads to the member's own UID or an explicitly authorized owner/staff account, validates admin document roles, removes self-service admin document creation, and removes demo UID exceptions.
- `storage.rules` now validates owner/staff roles for administrator access. Members still have access only under their own `kyc/{uid}/` path.
- Cloud Functions now provide sanitized leaderboard and referral projections. The Android screens use those callables instead of querying every member profile and transaction directly; referral views no longer receive phone numbers or UIDs.
- The Android release login and repository no longer contain the fixed demo phone/OTP or demo identity bypass.

These are local source changes only. They require a coordinated release and Firebase Functions/rules deployment. Old Firebase Storage download-token URLs already stored in profile documents remain bearer links until their tokens are rotated; profile access has been restricted in the prepared rules, but rotation still needs a production plan.
