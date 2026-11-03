const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret, defineString } = require("firebase-functions/params");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { createHash, createHmac, timingSafeEqual } = require("node:crypto");
const nodemailer = require("nodemailer");
const fetch = global.fetch;

initializeApp();

const db = getFirestore();
const auth = getAuth();
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");
const gmailSenderEmail = defineString("GMAIL_SENDER_EMAIL", {
  default: "vaibhav.guptakrl@gmail.com",
});
const razorpayKeyId = defineSecret("RAZORPAYX_KEY_ID");
const razorpayKeySecret = defineSecret("RAZORPAYX_KEY_SECRET");
const razorpayAccountNumber = defineSecret("RAZORPAYX_ACCOUNT_NUMBER");
const razorpayWebhookSecret = defineSecret("RAZORPAYX_WEBHOOK_SECRET");

exports.getPublicLeaderboard = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to view the leaderboard.");

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const [plumbers, transactions] = await Promise.all([
    db.collection("plumbers").get(),
    db.collection("transactions").where("createdAt", ">=", monthStart).get(),
  ]);

  const monthlyPoints = new Map();
  for (const transaction of transactions.docs) {
    const plumberId = transaction.get("plumberId");
    const points = Number(transaction.get("points") || 0);
    if (typeof plumberId === "string" && plumberId && points > 0) {
      monthlyPoints.set(plumberId, (monthlyPoints.get(plumberId) || 0) + points);
    }
  }

  const entries = plumbers.docs.map((profile) => {
    const lifetimeEarned = Number(profile.get("lifetimeEarned") || 0);
    const currentPoints = Number(profile.get("pointsBalance") || 0);
    return {
      name: String(profile.get("name") || "Plumber").slice(0, 80),
      plumberCode: String(profile.get("plumberCode") || "").slice(0, 32),
      pointsThisMonth: monthlyPoints.get(profile.id) ?? Math.min(currentPoints, lifetimeEarned),
      isCurrentUser: profile.id === request.auth.uid,
    };
  });
  entries.sort((left, right) => right.pointsThisMonth - left.pointsThisMonth);
  return { entries: entries.slice(0, 500) };
});

exports.getMyReferrals = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to view referrals.");
  const profile = await db.collection("plumbers").doc(request.auth.uid).get();
  if (!profile.exists) throw new HttpsError("not-found", "No plumber profile was found.");
  const referralCode = String(profile.get("plumberCode") || "");
  if (!referralCode) return { referrals: [] };

  const referrals = await db.collection("plumbers").where("referredBy", "==", referralCode).get();
  return {
    referrals: referrals.docs.map((referral) => ({
      name: String(referral.get("name") || "Plumber").slice(0, 80),
      plumberCode: String(referral.get("plumberCode") || "").slice(0, 32),
      hasPurchased: Number(referral.get("lifetimeEarned") || 0) > 0,
    })),
  };
});

exports.requestAccountDeletion = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in to request account deletion.");
  }
  const uid = request.auth.uid;
  if (uid === "demo_plumber_99999") {
    throw new HttpsError("failed-precondition", "Demo accounts cannot submit deletion requests.");
  }
  if (await isAdminUid(uid)) {
    throw new HttpsError("permission-denied", "Contact the account owner to manage an administrator account.");
  }

  const profile = await db.collection("plumbers").doc(uid).get();
  if (!profile.exists) {
    throw new HttpsError("not-found", "No plumber account was found for this sign-in.");
  }

  const requestRef = db.collection("accountDeletionRequests").doc(uid);
  await db.runTransaction(async (transaction) => {
    const previous = await transaction.get(requestRef);
    if (previous.exists && ["pending", "processing"].includes(previous.data().status)) return;
    transaction.set(requestRef, {
      uid,
      name: profile.get("name") || "",
      phone: profile.get("phone") || request.auth.token.phone_number || "",
      email: profile.get("email") || request.auth.token.email || "",
      status: "pending",
      requestedAt: new Date().toISOString(),
      source: "android_app",
    });
  });

  return { status: "pending" };
});

exports.processAccountDeletion = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth || !(await isAdminUid(request.auth.uid))) {
    throw new HttpsError("permission-denied", "Only an authorized administrator can process deletion requests.");
  }
  const uid = String(request.data?.uid || "");
  if (!uid || uid === request.auth.uid || uid === "demo_plumber_99999") {
    throw new HttpsError("invalid-argument", "A valid member account is required.");
  }

  const requestRef = db.collection("accountDeletionRequests").doc(uid);
  const deletionRequest = await requestRef.get();
  if (!deletionRequest.exists || deletionRequest.get("status") !== "pending") {
    throw new HttpsError("failed-precondition", "This deletion request is no longer pending.");
  }

  const profileRef = db.collection("plumbers").doc(uid);
  const [profile, redemptions, transactions, notifications, queuedMessages, auditByEntity, auditByDetails, auditByNewValue] = await Promise.all([
    profileRef.get(),
    db.collection("redemptionRequests").where("plumberId", "==", uid).get(),
    db.collection("transactions").where("plumberId", "==", uid).get(),
    db.collection("notifications").where("plumberId", "==", uid).get(),
    db.collection("messageQueue").where("plumberId", "==", uid).get(),
    db.collection("auditLogs").where("entityId", "==", uid).get(),
    db.collection("auditLogs").where("details.plumberId", "==", uid).get(),
    db.collection("auditLogs").where("newValue.plumberId", "==", uid).get(),
  ]);
  const referralTransactions = await db.collection("transactions").where("type", "==", "referral_bonus").get();
  const relatedReferralTransactions = referralTransactions.docs.filter((item) => {
    const summary = String(item.get("calculationSummary") || "");
    return [profile.get("name"), profile.get("plumberCode"), profile.get("referralCode")]
      .some((value) => typeof value === "string" && value.length > 0 && summary.includes(value));
  });
  const referringProfiles = profile.get("plumberCode")
    ? await db.collection("plumbers").where("referredBy", "==", profile.get("plumberCode")).get()
    : { docs: [] };
  const unsettled = redemptions.docs.filter((item) => ["pending", "approved", "processing", "queued", "initiated", "payout_processing"].includes(String(item.get("status") || "").toLowerCase()));
  if (unsettled.length > 0) {
    throw new HttpsError("failed-precondition", "Resolve pending or in-progress reward payouts before deleting this account.");
  }

  await db.runTransaction(async (transaction) => {
    const latestRequest = await transaction.get(requestRef);
    if (!latestRequest.exists || latestRequest.get("status") !== "pending") {
      throw new HttpsError("failed-precondition", "This deletion request is already being processed.");
    }
    transaction.update(requestRef, { status: "processing", processingStartedAt: new Date().toISOString() });
  });

  // Preserve non-identifying accounting history while removing member identifiers and payout destinations.
  const batches = [];
  const personalFields = /^(name|plumberName|plumberCode|plumberPhone|phone|email|address|upiId|vpa|fundAccountId|accountNumber|panNumber|aadhaarLast4|selfieUrl|panCardUrl|aadhaarCardUrl)$/i;
  const identifiers = [uid, profile.get("name"), profile.get("phone"), profile.get("email"), profile.get("panNumber"), profile.get("aadhaarLast4"), profile.get("plumberCode"), profile.get("referralCode"), ...redemptions.docs.flatMap((item) => ["plumberPhone", "phone", "email", "upiId", "vpa"].map((field) => item.get(field)))].filter((item) => typeof item === "string" && item.length > 0);
  const redact = (value) => {
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === "object" && typeof value.toDate !== "function") {
      return Object.fromEntries(Object.entries(value).filter(([key]) => !personalFields.test(key)).map(([key, child]) => [key, redact(child)]));
    }
    if (typeof value === "string") {
      return identifiers.reduce((result, identifier) => result.split(identifier).join("[removed]"), value);
    }
    return value;
  };
  let batch = db.batch();
  let batchWrites = 0;
  const queue = (ref, data) => {
    batch.set(ref, data, { merge: true });
    batchWrites += 1;
    if (batchWrites === 450) {
      batches.push(batch.commit());
      batch = db.batch();
      batchWrites = 0;
    }
  };
  const queueDelete = (ref) => {
    batch.delete(ref);
    batchWrites += 1;
    if (batchWrites === 450) {
      batches.push(batch.commit());
      batch = db.batch();
      batchWrites = 0;
    }
  };
  for (const item of transactions.docs) {
    queue(item.ref, { ...redact(item.data()), plumberId: "deleted_account", plumberName: "", plumberCode: "", calculationSummary: "Member account deleted" });
  }
  for (const item of redemptions.docs) {
    queue(item.ref, {
      ...redact(item.data()),
      plumberId: "deleted_account",
      plumberName: "",
      plumberCode: "",
      plumberPhone: "",
      phone: "",
      email: "",
      name: "",
      vpa: "",
      upiId: "",
      fundAccountId: "",
      accountNumber: "",
      calculationSummary: "Member account deleted",
    });
  }
  for (const item of notifications.docs) queueDelete(item.ref);
  for (const item of queuedMessages.docs) queueDelete(item.ref);
  for (const item of relatedReferralTransactions) queue(item.ref, { calculationSummary: "Referral reward; related account deleted" });
  for (const item of referringProfiles.docs) queue(item.ref, { referredBy: "" });
  const auditDocs = new Map([...auditByEntity.docs, ...auditByDetails.docs, ...auditByNewValue.docs].map((item) => [item.id, item]));
  for (const item of auditDocs.values()) queue(item.ref, redact(item.data()));
  if (batchWrites > 0) batches.push(batch.commit());
  try {
    await Promise.all(batches);
    await getStorage().bucket().deleteFiles({ prefix: `kyc/${uid}/` });
    await db.collection("registrationEmailNotifications").doc(uid).delete().catch(() => {});
    await profileRef.delete();
    await getAuth().deleteUser(uid).catch((error) => {
      if (error.code !== "auth/user-not-found") throw error;
    });
    await db.collection("accountDeletionAudit").add({ completedAt: new Date().toISOString(), completedBy: request.auth.uid });
    await requestRef.delete();
  } catch (error) {
    await requestRef.set({ status: "pending", lastProcessingError: String(error?.message || error).slice(0, 300) }, { merge: true });
    throw error;
  }
  return { status: "completed" };
});

async function isAdminUid(uid) {
  const admin = await db.collection("admins").doc(uid).get();
  return admin.exists && ["owner", "staff"].includes(String(admin.get("role") || ""));
}

async function settleRedemption(requestId, payout, eventId) {
  const requestRef = db.collection("redemptionRequests").doc(requestId);
  const eventRef = eventId ? db.collection("razorpayWebhookEvents").doc(eventId) : null;
  await db.runTransaction(async (transaction) => {
    const [requestSnapshot, eventSnapshot] = await Promise.all([
      transaction.get(requestRef),
      eventRef ? transaction.get(eventRef) : Promise.resolve(null),
    ]);
    if (!requestSnapshot.exists || (eventSnapshot && eventSnapshot.exists)) return;
    const request = requestSnapshot.data();
    if (request.status === "paid" || request.status === "payout_failed") {
      if (eventRef) transaction.create(eventRef, { receivedAt: new Date().toISOString(), payoutId: payout.id || null });
      return;
    }
    if (request.method !== "upi" || request.razorpayReferenceId !== requestId) return;

    const nextStatus = payout.status === "processed" ? "paid"
      : payout.status === "reversed" || payout.status === "failed" || payout.status === "rejected" ? "payout_failed"
        : "payout_processing";
    const updates = {
      status: nextStatus,
      razorpayPayoutId: payout.id || request.razorpayPayoutId || null,
      razorpayStatus: payout.status || "processing",
      upiReference: payout.utr || request.upiReference || null,
      updatedAt: new Date().toISOString(),
    };

    if (nextStatus === "payout_failed" && request.pointsDebited) {
      const plumberRef = db.collection("plumbers").doc(request.plumberId);
      const plumberSnapshot = await transaction.get(plumberRef);
      if (plumberSnapshot.exists) {
        const plumber = plumberSnapshot.data();
        const balance = Number(plumber.pointsBalance || 0);
        const restored = Number(request.points || 0);
        transaction.update(plumberRef, {
          pointsBalance: balance + restored,
          totalRedeemed: Math.max(0, Number(plumber.totalRedeemed || 0) - restored),
          updatedAt: updates.updatedAt,
        });
        const txRef = db.collection("transactions").doc(`razorpay_refund_${requestId}`);
        transaction.set(txRef, {
          plumberId: request.plumberId,
          plumberCode: request.plumberCode || "",
          plumberName: request.plumberName || "",
          points: restored,
          type: "redemption_refund",
          calculationSummary: `RazorpayX payout ${payout.status}; points restored.`,
          previousBalance: balance,
          newBalance: balance + restored,
          createdAt: updates.updatedAt,
        });
      }
      updates.pointsDebited = false;
      updates.adminRemarks = `RazorpayX payout ${payout.status}: ${payout.failure_reason || "payout was returned"}`;
    }
    transaction.update(requestRef, updates);
    if (eventRef) transaction.create(eventRef, { receivedAt: updates.updatedAt, payoutId: payout.id || null });
  });
}

async function releaseFailedPayoutAttempt(requestId, reason) {
  const requestRef = db.collection("redemptionRequests").doc(requestId);
  await db.runTransaction(async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);
    if (!requestSnapshot.exists) return;
    const redemption = requestSnapshot.data();
    if (redemption.razorpayPayoutId || !redemption.pointsDebited) return;
    const plumberRef = db.collection("plumbers").doc(redemption.plumberId);
    const plumberSnapshot = await transaction.get(plumberRef);
    if (!plumberSnapshot.exists) return;
    const plumber = plumberSnapshot.data();
    const balance = Number(plumber.pointsBalance || 0);
    const restored = Number(redemption.points || 0);
    const now = new Date().toISOString();
    transaction.update(plumberRef, {
      pointsBalance: balance + restored,
      totalRedeemed: Math.max(0, Number(plumber.totalRedeemed || 0) - restored),
      updatedAt: now,
    });
    transaction.update(requestRef, {
      status: "pending", pointsDebited: false, payoutError: reason.slice(0, 400), updatedAt: now,
    });
    transaction.set(db.collection("transactions").doc(`razorpay_refund_${requestId}`), {
      plumberId: redemption.plumberId, plumberCode: redemption.plumberCode || "", plumberName: redemption.plumberName || "",
      points: restored, type: "redemption_refund", calculationSummary: "RazorpayX did not accept the payout; points restored.",
      previousBalance: balance, newBalance: balance + restored, createdAt: now,
    });
  });
}

exports.createRazorpayUpiPayout = onCall({
  region: "asia-south1",
  secrets: [razorpayKeyId, razorpayKeySecret, razorpayAccountNumber],
  timeoutSeconds: 60,
}, async (request) => {
  if (!request.auth || !(request.auth.token.role === "owner" || request.auth.token.role === "staff" || await isAdminUid(request.auth.uid))) {
    throw new HttpsError("permission-denied", "Only an admin can process a payout.");
  }
  const requestId = String(request.data?.requestId || "");
  if (!/^[A-Za-z0-9_-]{4,36}$/.test(requestId)) throw new HttpsError("invalid-argument", "Invalid redemption request.");
  const requestRef = db.collection("redemptionRequests").doc(requestId);
  const plumberRefForRequest = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(requestRef);
    if (!snapshot.exists) throw new HttpsError("not-found", "Redemption request not found.");
    const redemption = snapshot.data();
    if (redemption.method !== "upi" || !redemption.upiId || !redemption.upiId.includes("@")) {
      throw new HttpsError("failed-precondition", "This request does not contain a valid UPI ID.");
    }
    if (redemption.razorpayPayoutId) return { done: true, payoutId: redemption.razorpayPayoutId, status: redemption.razorpayStatus };
    if (redemption.status !== "pending" && redemption.status !== "payout_processing") {
      throw new HttpsError("failed-precondition", "This redemption is no longer pending.");
    }
    if (!redemption.pointsDebited) {
      const plumberRef = db.collection("plumbers").doc(redemption.plumberId);
      const plumberSnapshot = await transaction.get(plumberRef);
      if (!plumberSnapshot.exists) throw new HttpsError("not-found", "Plumber profile not found.");
      const plumber = plumberSnapshot.data();
      const points = Number(redemption.points);
      if (!Number.isSafeInteger(points) || points <= 0 || Number(plumber.pointsBalance || 0) < points) {
        throw new HttpsError("failed-precondition", "The plumber does not have enough points for this payout.");
      }
      const balance = Number(plumber.pointsBalance || 0);
      const now = new Date().toISOString();
      transaction.update(plumberRef, { pointsBalance: balance - points, totalRedeemed: Number(plumber.totalRedeemed || 0) + points, updatedAt: now });
      transaction.create(db.collection("transactions").doc(`razorpay_redeem_${requestId}`), {
        plumberId: redemption.plumberId, plumberCode: redemption.plumberCode || "", plumberName: redemption.plumberName || "",
        points: -points, rupeeValue: Number(redemption.rupeeValue), type: "redemption",
        calculationSummary: `RazorpayX UPI payout to ${redemption.upiId}`,
        previousBalance: balance, newBalance: balance - points, adminId: request.auth.uid,
        adminEmail: request.auth.token.email || "", createdAt: now,
      });
      transaction.update(requestRef, { status: "payout_processing", pointsDebited: true, razorpayReferenceId: requestId, processedBy: request.auth.token.email || request.auth.uid, updatedAt: now });
    }
    return { done: false, redemption };
  });

  if (plumberRefForRequest.done) return plumberRefForRequest;
  const redemption = plumberRefForRequest.redemption;
  const rupees = Number(redemption.rupeeValue);
  const amount = Math.round(rupees * 100);
  if (!Number.isSafeInteger(amount) || amount < 100) {
    await releaseFailedPayoutAttempt(requestId, "Amount is below ₹1 or cannot be represented safely in paise.");
    throw new HttpsError("failed-precondition", "The payout amount must be at least ₹1.");
  }
  const phone = String(redemption.plumberPhone || "").replace(/\D/g, "").slice(-10);
  const contactName = String(redemption.plumberName || "")
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9 .’'()\/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50) || `Plumber ${phone.slice(-4) || "Member"}`;
  const payload = {
    account_number: razorpayAccountNumber.value(), amount, currency: "INR", mode: "UPI", purpose: "payout",
    queue_if_low_balance: true,
    reference_id: requestId,
    narration: "Shiv Rewards",
    fund_account: {
      account_type: "vpa",
      vpa: { address: redemption.upiId },
      contact: {
        name: contactName.length >= 3 ? contactName : `Plumber ${phone.slice(-4) || "Member"}`,
        contact: phone,
        type: "vendor", reference_id: `plumber_${redemption.plumberId}`.slice(0, 40),
      },
    },
  };
  let response;
  try {
    response = await fetch("https://api.razorpay.com/v1/payouts", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${razorpayKeyId.value()}:${razorpayKeySecret.value()}`).toString("base64")}`,
        "Content-Type": "application/json",
        "X-Payout-Idempotency": requestId,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new HttpsError("unavailable", "Could not reach RazorpayX. Retry this payout; the same request reference prevents duplicate transfers.");
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = result.error?.description || "RazorpayX rejected the payout request.";
    await releaseFailedPayoutAttempt(requestId, message);
    throw new HttpsError("failed-precondition", message);
  }

  await settleRedemption(requestId, result);
  return { payoutId: result.id, status: result.status };
});

exports.razorpayPayoutWebhook = onRequest({
  region: "asia-south1",
  secrets: [razorpayWebhookSecret],
  maxInstances: 5,
}, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const signature = req.get("x-razorpay-signature") || "";
  const expected = createHmac("sha256", razorpayWebhookSecret.value()).update(req.rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return res.status(401).send("Invalid signature");
  }
  const eventId = req.get("x-razorpay-event-id") || "";
  const body = req.body || {};
  if (!["payout.processed", "payout.reversed", "payout.failed", "payout.rejected", "payout.updated", "payout.queued", "payout.initiated", "payout.pending"].includes(body.event)) {
    return res.status(200).send("Ignored");
  }
  const payout = body.payload?.payout?.entity;
  if (!payout?.reference_id || !payout?.id) return res.status(400).send("Missing payout reference");
  try {
    const eventKey = eventId ? createHash("sha256").update(eventId).digest("hex") : undefined;
    await settleRedemption(payout.reference_id, payout, eventKey);
    return res.status(200).send("OK");
  } catch (error) {
    console.error("Razorpay webhook processing failed", error);
    return res.status(500).send("Retry later");
  }
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

exports.notifyAdminOfNewRegistration = onDocumentCreated(
  {
    document: "plumbers/{plumberId}",
    region: "asia-south1",
    secrets: [gmailAppPassword],
    retry: true,
  },
  async (event) => {
    const applicant = event.data?.data();
    if (!applicant || applicant.registrationSource !== "mobile_signup") return;

    const notificationRef = db.collection("registrationEmailNotifications").doc(event.params.plumberId);
    const ownerSnapshot = await db.collection("admins").where("role", "==", "owner").get();
    const recipients = [...new Set(ownerSnapshot.docs
      .map((admin) => admin.data().email)
      .filter((email) => typeof email === "string" && email.includes("@")))];
    if (recipients.length === 0) {
      throw new Error("No owner admin email is configured in the admins collection.");
    }

    const claimTime = Date.now();
    const claimed = await db.runTransaction(async (transaction) => {
      const notification = await transaction.get(notificationRef);
      const previous = notification.data();
      if (previous?.status === "sent") return false;
      if (previous?.status === "sending" && previous.leaseUntil?.toMillis() > claimTime) {
        throw new Error("Registration email is already being sent; retrying this event.");
      }
      transaction.set(notificationRef, {
        status: "sending",
        attempts: (previous?.attempts || 0) + 1,
        leaseUntil: new Date(claimTime + 2 * 60 * 1000),
        registrationId: event.params.plumberId,
      }, { merge: true });
      return true;
    });
    if (!claimed) return;

    const name = escapeHtml(applicant.name);
    const phone = escapeHtml(applicant.phone);
    const email = escapeHtml(applicant.email);
    const address = escapeHtml(applicant.address);
    const plumberCode = escapeHtml(applicant.plumberCode);
    const text = [
      "A new Shiv Agency Rewards membership application needs review.",
      `Name: ${applicant.name || ""}`,
      `Mobile: ${applicant.phone || ""}`,
      `Email: ${applicant.email || ""}`,
      `Address: ${applicant.address || ""}`,
      `Application ID: ${event.params.plumberId}`,
      `Member code: ${applicant.plumberCode || ""}`,
    ].join("\n");
    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1a1c1a;line-height:1.5">
      <h2>New membership application</h2>
      <p>A new Shiv Agency Rewards signup is waiting for admin review.</p>
      <table style="border-collapse:collapse">
        <tr><td style="padding:6px 14px 6px 0"><strong>Name</strong></td><td>${name}</td></tr>
        <tr><td style="padding:6px 14px 6px 0"><strong>Mobile</strong></td><td>${phone}</td></tr>
        <tr><td style="padding:6px 14px 6px 0"><strong>Email</strong></td><td>${email}</td></tr>
        <tr><td style="padding:6px 14px 6px 0"><strong>Address</strong></td><td>${address}</td></tr>
        <tr><td style="padding:6px 14px 6px 0"><strong>Member code</strong></td><td>${plumberCode}</td></tr>
      </table>
      <p>Open the Admin app’s Plumbers page to review the application and selfie.</p>
    </body></html>`;

    try {
      const senderEmail = gmailSenderEmail.value();
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: senderEmail,
          pass: gmailAppPassword.value(),
        },
        connectionTimeout: 20_000,
        greetingTimeout: 10_000,
        socketTimeout: 30_000,
      });
      const delivery = await transporter.sendMail({
        from: { name: "Shiv Agency Rewards", address: senderEmail },
        to: recipients,
        subject: `New membership application: ${applicant.name || "New member"}`,
        text,
        html,
        messageId: `<shiv-registration-${event.params.plumberId}@shivagency.local>`,
      });

      await notificationRef.set({
        status: "sent",
        recipients,
        senderEmail,
        messageId: delivery.messageId,
        sentAt: new Date().toISOString(),
        leaseUntil: null,
        registrationId: event.params.plumberId,
      }, { merge: true });
    } catch (error) {
      await notificationRef.set({
        status: "failed",
        lastError: String(error?.message || error).slice(0, 500),
        failedAt: new Date().toISOString(),
        leaseUntil: null,
      }, { merge: true });
      throw error;
    }
  }
);

