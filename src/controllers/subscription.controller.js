import prisma from "../config/prisma.js";
import { cancelSubscription, createPremiumCheckout, ensurePremiumPlan } from "../services/paymob.service.js";

const publicSubscription = (user) => ({
  plan: user.planTier,
  status: user.subscriptionStatus,
  endsAt: user.subscriptionEndsAt,
});

const getSubscription = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  res.json(publicSubscription(user));
};

const chooseFreePlan = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  if (user.paymobSubscriptionId && user.subscriptionStatus === "ACTIVE") {
    return res.status(409).json({ error: "Cancel the Premium subscription before switching to Free." });
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { planTier: "FREE", subscriptionStatus: "ACTIVE", subscriptionEndsAt: null, paymobPlanId: null, paymobIntentionId: null },
  });
  res.json({ message: "Free plan activated", subscription: publicSubscription(updated) });
};

const startPremiumCheckout = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const { first_name, last_name, email, phone_number, apartment = "N/A", building = "N/A", street = "N/A", floor = "N/A", city = "N/A", state = "N/A", country = "N/A" } = req.body;
    if (![first_name, last_name, email, phone_number].every(Boolean)) {
      return res.status(400).json({ error: "first_name, last_name, email, and phone_number are required" });
    }
    const planId = await ensurePremiumPlan();
    const checkout = await createPremiumCheckout({ user, planId, billingData: { first_name, last_name, email, phone_number, apartment, building, street, floor, city, state, country } });
    await prisma.user.update({ where: { id: user.id }, data: { planTier: "PREMIUM", subscriptionStatus: "PENDING", paymobPlanId: planId, paymobIntentionId: checkout.intentionId } });
    res.status(201).json({ checkoutUrl: checkout.checkoutUrl });
  } catch (error) {
    res.status(502).json({ error: error.message });
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
    await prisma.user.update({ where: { id: userId }, data: { planTier: "PREMIUM", subscriptionStatus: "ACTIVE", ...(subscriptionId ? { paymobSubscriptionId: String(subscriptionId) } : {}), ...(payload.next_billing ? { subscriptionEndsAt: new Date(payload.next_billing) } : {}) } });
  } else if (failed) {
    await prisma.user.update({ where: { id: userId }, data: { subscriptionStatus: payload.state === "failed" ? "PAST_DUE" : "CANCELED" } });
  }
  res.sendStatus(200);
};

export { getSubscription, chooseFreePlan, startPremiumCheckout, cancelCurrentSubscription, paymobWebhook };
