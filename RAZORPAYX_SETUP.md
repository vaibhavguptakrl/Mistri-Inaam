# RazorpayX UPI Payout Setup

UPI redemption requests are initiated from the Admin app and paid through RazorpayX. Razorpay API credentials stay in Firebase Functions secrets; they are never shipped in the Android app or browser bundle.

## Before going live

1. Activate RazorpayX Payouts for the business and enable API payouts. UPI VPA payouts require an active RazorpayX account and available business balance.
2. In RazorpayX, create an API key pair and note the **Customer Identifier** (the payout `account_number`; it is different for Test and Live mode).
3. Set the four Firebase secrets from the repository root. Firebase prompts for each value; do not put secret values in source files or command history:

   ```powershell
   firebase functions:secrets:set RAZORPAYX_KEY_ID
   firebase functions:secrets:set RAZORPAYX_KEY_SECRET
   firebase functions:secrets:set RAZORPAYX_ACCOUNT_NUMBER
   firebase functions:secrets:set RAZORPAYX_WEBHOOK_SECRET
   ```

4. Deploy the two payout functions:

   ```powershell
   firebase deploy --only functions:createRazorpayUpiPayout,functions:razorpayPayoutWebhook
   ```

5. In the RazorpayX webhook settings, add:

   `https://asia-south1-YOUR_FIREBASE_PROJECT_ID.cloudfunctions.net/razorpayPayoutWebhook`

   Use the same webhook secret set above and subscribe to `payout.processed`, `payout.reversed`, `payout.failed`, `payout.rejected`, `payout.updated`, `payout.queued`, `payout.initiated`, and `payout.pending`.

6. Run a small Test Mode payout first. Then switch all three API credentials (Key ID, Key Secret, Customer Identifier) together to Live values and configure the Live webhook endpoint/secret.

RazorpayX requires payout requests to carry an idempotency key and reports payout state through webhooks. The redemption document uses its own ID as both the payout reference and idempotency key. A payout reversal restores the plumber's points once and records a refund ledger entry. The integration requires requests of at least ₹1; RazorpayX applies any account-specific upper limits.

RazorpayX documents IP allowlisting for payout API access. Firebase Functions do not have a fixed outbound IP by default; if the RazorpayX account enforces source IP allowlisting, configure static egress for the function before enabling Live payouts.
