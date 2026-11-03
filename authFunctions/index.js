const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { defineSecret, defineString } = require("firebase-functions/params");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { createHash } = require("node:crypto");
const nodemailer = require("nodemailer");
initializeApp();
const db = getFirestore();
const auth = getAuth();
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");
const gmailSenderEmail = defineString("GMAIL_SENDER_EMAIL", { default: "vaibhav.guptakrl@gmail.com" });
function normalizeMemberPhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length !== 10) throw new HttpsError("invalid-argument", "Enter a valid 10-digit mobile number.");
  return `+91${digits}`;
}

function phoneIndexId(phone) {
  return createHash("sha256").update(phone).digest("hex");
}

exports.registerMemberAccount = onCall({ region: "asia-south1" }, async (request) => {
  const phone = normalizeMemberPhone(request.data?.phone);
  const email = String(request.data?.email || "").trim().toLowerCase();
  const password = String(request.data?.password || "");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpsError("invalid-argument", "Enter a valid email address.");
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new HttpsError("invalid-argument", "Use at least 8 characters with a letter and a number.");
  }

  const indexRef = db.collection("memberPhoneIndex").doc(phoneIndexId(phone));
  const uid = require("node:crypto").randomUUID();
  try {
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(indexRef);
      if (existing.exists) throw new HttpsError("already-exists", "An account with these details already exists.");
      tx.create(indexRef, { uid, email, createdAt: new Date().toISOString() });
    });
    await auth.createUser({ uid, email, password, disabled: false });
    return { customToken: await auth.createCustomToken(uid) };
  } catch (error) {
    await db.runTransaction(async (tx) => {
      const index = await tx.get(indexRef);
      if (index.exists && index.get("uid") === uid) tx.delete(indexRef);
    }).catch(() => {});
    if (error.code === "auth/email-already-exists") {
      const apiKey = String(request.data?.apiKey || "");
      if (apiKey) {
        try {
          const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
          });
          if (response.ok) {
            const existingUser = await auth.getUserByEmail(email);
            const linkedPhone = await db.collection("memberPhoneIndex").where("email", "==", email).limit(1).get();
            if (!linkedPhone.empty) throw new HttpsError("already-exists", "An account with these details already exists.");
            await indexRef.create({ uid: existingUser.uid, email, createdAt: new Date().toISOString() });
            return { customToken: await auth.createCustomToken(existingUser.uid) };
          }
        } catch (recoveryError) {
          if (recoveryError instanceof HttpsError) throw recoveryError;
        }
      }
      throw new HttpsError("already-exists", "An account with these details already exists.");
    }
    if (error instanceof HttpsError) throw error;
    console.error("Member account registration failed", error);
    throw new HttpsError("internal", "Could not create the account. Please try again.");
  }
});

exports.setMemberBlocked = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Admin sign-in required.");
  const caller = await db.collection("admins").doc(request.auth.uid).get();
  if (!caller.exists || !["owner", "staff"].includes(caller.get("role"))) {
    throw new HttpsError("permission-denied", "Admin permission required.");
  }
  const uid = String(request.data?.plumberId || "");
  const blocked = request.data?.blocked === true;
  if (!uid || uid.length > 128) throw new HttpsError("invalid-argument", "Select a valid member.");
  const profileRef = db.collection("plumbers").doc(uid);
  const profile = await profileRef.get();
  if (!profile.exists) throw new HttpsError("not-found", "Member profile not found.");
  await auth.updateUser(uid, { disabled: blocked });
  await profileRef.update({ accountStatus: blocked ? "blocked" : "active", updatedAt: new Date().toISOString() });
  await db.collection("auditLogs").add({
    adminId: request.auth.uid,
    adminEmail: request.auth.token.email || caller.get("email") || "admin",
    action: blocked ? "BLOCK_MEMBER" : "UNBLOCK_MEMBER",
    entity: "plumber",
    entityId: uid,
    timestamp: new Date().toISOString(),
  });
  return { blocked };
});

exports.signInMemberWithPhonePassword = onCall({ region: "asia-south1" }, async (request) => {
  const phone = normalizeMemberPhone(request.data?.phone);
  const password = String(request.data?.password || "");
  const apiKey = String(request.data?.apiKey || "");
  const index = await db.collection("memberPhoneIndex").doc(phoneIndexId(phone)).get();
  if (!index.exists || password.length < 1 || !apiKey) {
    throw new HttpsError("unauthenticated", "Mobile number or password is incorrect.");
  }
  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: index.get("email"), password, returnSecureToken: true }),
    });
    if (!response.ok) throw new Error("Invalid credentials");
    const uid = index.get("uid");
    await auth.getUser(uid);
    return { customToken: await auth.createCustomToken(uid) };
  } catch (_) {
    throw new HttpsError("unauthenticated", "Mobile number or password is incorrect.");
  }
});

exports.requestMemberPasswordReset = onCall({ region: "asia-south1", secrets: [gmailAppPassword] }, async (request) => {
  const identifier = String(request.data?.identifier || "").trim();
  let email = identifier.toLowerCase();
  if (/^\+?[\d\s()-]+$/.test(identifier)) {
    const phone = normalizeMemberPhone(identifier);
    const index = await db.collection("memberPhoneIndex").doc(phoneIndexId(phone)).get();
    email = index.exists ? String(index.get("email") || "") : "";
  }
  try {
    if (email) {
      const link = await auth.generatePasswordResetLink(email);
      const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: gmailSenderEmail.value(), pass: gmailAppPassword.value() } });
      await transporter.sendMail({ from: gmailSenderEmail.value(), to: email, subject: "Reset your Shiv Agency Rewards password", text: `Use this secure link to reset your password. It can only be used once and expires automatically:\n\n${link}\n\nIf you did not request a reset, ignore this message.` });
    }
  } catch (error) {
    console.warn("Password reset request processed without revealing account state", error.message);
  }
  return { message: "If the account matches, password reset instructions will be sent to its registered email." };
});


