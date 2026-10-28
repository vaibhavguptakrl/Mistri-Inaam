# Shiv Agency — WhatsApp Business Cloud API Integration Guide

This guide explains how **Shiv Agency** can activate automated WhatsApp message updates when the business is ready to upgrade from the free Firebase Spark plan to automated messaging.

---

## 1. Two Types of WhatsApp Features in Shiv Agency Rewards

| Feature | Status in v1 | Cost | Setup Required |
| :--- | :--- | :--- | :--- |
| **A. 1-Click WhatsApp Chat (`wa.me`)** | **LIVE & WORKING NOW** | **100% FREE** | None. Works instantly on mobile and desktop web browsers. |
| **B. Automated WhatsApp Notifications** | **COMING SOON (Groundwork Ready)** | Meta conversation rates (~₹0.30/msg) | Meta Developer account + Blaze Plan. |

> [!NOTE]
> All server-side code, provider-isolated interfaces, webhook verification stubs, and bilingual templates for **Feature B** are already fully implemented in `functions/src/whatsapp/` and Firestore `messageTemplates`. To go live, no code refactor is needed—only credential configuration and flipping a single switch.

---

## 2. Prerequisites for Automated WhatsApp

Before enabling automated WhatsApp notifications, ensure you have:

1. **Meta for Developers Account**: Sign up at [developers.facebook.com](https://developers.facebook.com/).
2. **Meta Business Manager & Verification**: A verified Meta Business Manager account using Shiv Agency's GSTIN or business registration documents.
3. **Dedicated Clean Phone Number**:
   - Must be able to receive an SMS or voice OTP for verification.
   - **MUST NOT** be currently registered on the WhatsApp app or WhatsApp Business app on any smartphone. If it is already registered, delete the WhatsApp account from WhatsApp settings before linking.
4. **Firebase Blaze Plan**: Firebase Cloud Functions background queue processors require the Pay-As-You-Go Blaze plan (free tier includes 2M function invocations/month).

---

## 3. Step-by-Step Meta Cloud API Setup

### Step 1: Create a Meta App
1. Go to [Meta for Developers](https://developers.facebook.com/) and click **My Apps** > **Create App**.
2. Select **Other** as the use case > Click **Next**.
3. Select **Business** as the app type > Click **Next**.
4. Enter App Name: `Shiv Agency Rewards` and select your verified Business Manager.
5. In the App Dashboard, find **WhatsApp** and click **Set up**.

### Step 2: Add Clean Phone Number & Get Credentials
1. Under WhatsApp in the left sidebar, navigate to **API Setup**.
2. Under **Step 5: Add a phone number**, click **Add phone number**.
3. Enter Display Name (e.g. `Shiv Agency Rewards`), category (`Retail`), and your dedicated phone number.
4. Verify the number via SMS OTP.
5. Note down:
   - **Phone Number ID** (e.g. `104829102910291`)
   - **WhatsApp Business Account ID** (e.g. `102910291029102`)

### Step 3: Generate Permanent System User Token
> [!CAUTION]
> The temporary token in the Meta dashboard expires after 24 hours. You MUST generate a permanent token via a System User.

1. Open [Meta Business Settings](https://business.facebook.com/settings).
2. Go to **Users** > **System Users** > Click **Add**.
3. Name: `ShivAgencyServer`, Role: `Admin`.
4. Click **Assign Assets** > select your WhatsApp Business Account > grant **Full Control**.
5. Click **Generate New Token**:
   - App: `Shiv Agency Rewards`
   - Permissions: check `whatsapp_business_messaging` and `whatsapp_business_management`.
   - Token Expiration: **Never**.
6. Copy and store this permanent access token securely.

---

## 4. Message Templates (Already Pre-Built)

Meta requires all business-initiated messages to use pre-approved templates. We have provided ready-to-copy bilingual templates in [`admin/src/lib/whatsappTemplates.ts`](file:///c:/Users/DELL/Documents/antigravity/modest-franklin/admin/src/lib/whatsappTemplates.ts):

| Template ID | Event | Category | Variables |
| :--- | :--- | :--- | :--- |
| `points_credited_v1` | Points Credited | `UTILITY` | `{{1}}` Plumber Name, `{{2}}` Points, `{{3}}` Bill Amt, `{{4}}` New Balance |
| `redemption_approved_v1` | Redemption Paid | `UTILITY` | `{{1}}` Name, `{{2}}` Points, `{{3}}` Rs, `{{4}}` Method (UPI/Tool), `{{5}}` UTR |
| `redemption_rejected_v1` | Redemption Rejected | `UTILITY` | `{{1}}` Name, `{{2}}` Points, `{{3}}` Rejection Reason |
| `new_scheme_promo_v1` | Scheme Announcement | `MARKETING` | `{{1}}` Name, `{{2}}` Scheme Title, `{{3}}` Offer, `{{4}}` End Date |
| `monthly_target_bonus_v1` | Monthly Bonus | `UTILITY` | `{{1}}` Name, `{{2}}` Bonus Points |

### How to Submit Templates in Meta:
1. In Meta WhatsApp Manager, navigate to **Account Tools** > **Message Templates**.
2. Click **Create Template**.
3. Copy-paste the exact English and Hindi text from [`MessageLogPage.tsx`](file:///c:/Users/DELL/Documents/antigravity/modest-franklin/admin/src/pages/MessageLogPage.tsx) (tab: **WhatsApp Templates**).
4. Meta usually approves Utility templates within 5 to 30 minutes.

---

## 5. Meta Conversation Pricing for India

Meta charges per 24-hour conversation window:

- **Utility / Transactional** (Points credited, redemption receipts): **~₹0.30 to ₹0.35** per 24-hour session.
- **Marketing** (Festival schemes, bonus promos): **~₹0.75 to ₹0.85** per 24-hour session.
- **Service** (Plumber replies back with a query): Free within a 24-hour customer care window.
- Meta provides **1,000 free service conversations per month** for every WhatsApp Business Account.

---

## 6. Going Live (Flipping the Switch)

Once Meta has approved your phone number and templates:

1. Store secrets in Firebase:
   ```bash
   firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN
   firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID
   firebase functions:secrets:set WHATSAPP_WEBHOOK_VERIFY_TOKEN
   ```
2. In the Admin Web App, go to **Feature Controls** (`http://localhost:3000/features`).
3. Toggle **"WhatsApp Automatic Messages"** to **ON**.
4. Any purchase points or redemptions will now automatically send official WhatsApp notifications to contractors who have consented to WhatsApp updates!
