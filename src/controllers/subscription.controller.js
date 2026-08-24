import prisma from "../config/prisma.js";
import { cancelSubscription, createPremiumCheckout, getTransaction } from "../services/paymob.service.js";

const publicSubscription = (user) => ({
  plan: user.planTier,
  status: user.subscriptionStatus,
  endsAt: user.subscriptionEndsAt,
  trialAvailable: !user.trialStartedAt,
});

const getSubscription = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  res.json(publicSubscription(user));
};

const startTrial = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.role !== "COMPANY_ADMIN") return res.status(403).json({ error: "Only Company Admin accounts can start a workspace trial." });
  if (!user.companyId) return res.status(409).json({ error: "Create your company workspace before starting a trial." });
  if (user.planTier === "PREMIUM" && user.subscriptionStatus === "ACTIVE") return res.status(409).json({ error: "This account already has an active annual plan." });
  if (user.trialStartedAt) return res.status(409).json({ error: "The 30-day trial has already been used for this account." });

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      planTier: "TRIAL",
      subscriptionStatus: "TRIALING",
      trialStartedAt: now,
      subscriptionEndsAt: trialEndsAt,
      paymobPlanId: null,
      paymobIntentionId: null,
    },
  });
  res.json({ message: "30-day trial activated", subscription: publicSubscription(updated) });
};

const startPremiumCheckout = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user || user.role !== "COMPANY_ADMIN") return res.status(403).json({ error: "Only Company Admin accounts can purchase a workspace plan." });
    if (!user.companyId) return res.status(409).json({ error: "Create your company workspace before purchasing a plan." });
    const { first_name, last_name, email, phone_number, apartment = "N/A", building = "N/A", street = "N/A", floor = "N/A", city = "N/A", state = "N/A", country = "N/A" } = req.body;
    if (![first_name, last_name, email, phone_number].every(Boolean)) {
      return res.status(400).json({ error: "first_name, last_name, email, and phone_number are required" });
    }
    const checkout = await createPremiumCheckout({ user, billingData: { first_name, last_name, email, phone_number, apartment, building, street, floor, city, state, country } });
    await prisma.user.update({ where: { id: user.id }, data: { planTier: "PREMIUM", subscriptionStatus: "PENDING", paymobPlanId: null, paymobIntentionId: checkout.intentionId } });
    res.status(201).json({ checkoutUrl: checkout.checkoutUrl });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
};

const transactionReference = (transaction) => transaction.merchant_order_id
  || transaction.special_reference
  || transaction.order?.merchant_order_id
  || transaction.order?.special_reference
  || transaction.intention?.special_reference
  || transaction.payment_key_claims?.extra?.special_reference;

const transactionIntentionId = (transaction) => transaction.intention_id
  || transaction.intention?.id
  || transaction.payment_key_claims?.extra?.intention_id;

const confirmPremiumPayment = async (req, res) => {
  try {
    const transactionId = String(req.body.transactionId || "").trim();
    if (!/^\d+$/.test(transactionId)) return res.status(400).json({ error: "A valid Paymob transaction ID is required." });

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user || user.role !== "COMPANY_ADMIN") return res.status(403).json({ error: "Only Company Admin accounts can confirm a workspace payment." });

    const transaction = await getTransaction(transactionId);
    const reference = String(transactionReference(transaction) || "");
    const intentionId = String(transactionIntentionId(transaction) || "");
    const belongsToUser = reference.startsWith(`shipops-subscription-${user.id}-`)
      || (user.paymobIntentionId && intentionId === String(user.paymobIntentionId));
    if (!belongsToUser) return res.status(403).json({ error: "This payment does not belong to your ShipOps account." });

    const expectedAmount = Number(process.env.PAYMOB_PREMIUM_AMOUNT_CENTS || 10000);
    const expectedCurrency = (process.env.PAYMOB_CURRENCY || "EGP").toUpperCase();
    if (Number(transaction.amount_cents) !== expectedAmount || String(transaction.currency || "").toUpperCase() !== expectedCurrency) {
      return res.status(409).json({ error: "The payment amount or currency does not match the ShipOps annual plan." });
    }

    if (transaction.pending === true) return res.status(202).json({ pending: true, subscription: publicSubscription(user) });
    if (transaction.success !== true || transaction.is_refunded === true || transaction.is_voided === true) {
      return res.status(409).json({ error: "Paymob has not confirmed this payment as successful." });
    }

    const annualEndsAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { planTier: "PREMIUM", subscriptionStatus: "ACTIVE", subscriptionEndsAt: annualEndsAt },
    });
    return res.json({ message: "Annual subscription activated", subscription: publicSubscription(updated) });
  } catch (error) {
    return res.status(502).json({ error: error.message || "Unable to verify the Paymob transaction." });
  }
};

const cancelCurrentSubscription = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user.paymobSubscriptionId) return res.status(400).json({ error: "No active Paymob subscription found" });
    const result = await cancelSubscription(user.paymobSubscriptionId);
    const updated = await prisma.user.update({ where: { id: user.id }, data: { subscriptionStatus: "CANCELED", subscriptionEndsAt: result.next_billing ? new Date(result.next_billing) : user.subscriptionEndsAt } });
    res.json({ message: "Subscription canceled", subscription: publicSubscription(updated) });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
};

// The random query token makes this public endpoint safe to expose to Paymob.
const paymobWebhook = async (req, res) => {
  if (!process.env.PAYMOB_WEBHOOK_TOKEN || req.query.token !== process.env.PAYMOB_WEBHOOK_TOKEN) return res.sendStatus(401);
  const payload = req.body.obj || req.body;
  const reference = payload.merchant_order_id || payload.special_reference || payload.order?.merchant_order_id;
  const userId = Number(String(reference || "").match(/^shipops-subscription-(\d+)-/)?.[1]);
  if (!userId) return res.sendStatus(200);
  const success = payload.success === true || payload.state === "active";
  const failed = payload.success === false || ["failed", "canceled", "cancelled"].includes(payload.state);
  if (success) {
    const subscriptionId = payload.subscription_id || payload.subscription?.id;
    const annualEndsAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await prisma.user.update({ where: { id: userId }, data: { planTier: "PREMIUM", subscriptionStatus: "ACTIVE", ...(subscriptionId ? { paymobSubscriptionId: String(subscriptionId) } : {}), subscriptionEndsAt: payload.next_billing ? new Date(payload.next_billing) : annualEndsAt } });
  } else if (failed) {
    await prisma.user.update({ where: { id: userId }, data: { subscriptionStatus: payload.state === "failed" ? "PAST_DUE" : "CANCELED" } });
  }
  res.sendStatus(200);
};

export { getSubscription, startTrial, startPremiumCheckout, confirmPremiumPayment, cancelCurrentSubscription, paymobWebhook };
