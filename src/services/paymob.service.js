const baseUrl = () => (process.env.PAYMOB_BASE_URL || "https://accept.paymob.com").replace(/\/$/, "");
const premiumAmount = () => Number(process.env.PAYMOB_PREMIUM_AMOUNT_CENTS || 10000);
const premiumCurrency = () => process.env.PAYMOB_CURRENCY || "USD";
const planName = "ShipOps Premium Monthly";
const paymentSuccessUrl = () => process.env.PAYMOB_REDIRECTION_URL || `${(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "")}/payment/success`;

async function paymobRequest(path, { method = "GET", headers = {}, body } = {}) {
  const response = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.detail || "Paymob request failed");
  return data;
}

async function getAuthToken() {
  if (!process.env.PAYMOB_API_KEY) throw new Error("PAYMOB_API_KEY is not configured");
  const data = await paymobRequest("/api/auth/tokens", {
    method: "POST",
    body: { api_key: process.env.PAYMOB_API_KEY },
  });
  return data.token;
}

async function ensurePremiumPlan() {
  if (process.env.PAYMOB_PREMIUM_PLAN_ID) return Number(process.env.PAYMOB_PREMIUM_PLAN_ID);
  if (!process.env.PAYMOB_MOTO_INTEGRATION_ID || !process.env.PAYMOB_WEBHOOK_URL) {
    throw new Error("Set PAYMOB_PREMIUM_PLAN_ID, or configure PAYMOB_MOTO_INTEGRATION_ID and PAYMOB_WEBHOOK_URL");
  }
  const token = await getAuthToken();
  const headers = { Authorization: `Bearer ${token}` };
  const plansResponse = await paymobRequest("/api/acceptance/subscription-plans", { headers });
  const plans = Array.isArray(plansResponse) ? plansResponse : (plansResponse.results || plansResponse.data || []);
  const existing = plans.find((plan) => plan.name === planName && plan.frequency === 30 && plan.amount_cents === premiumAmount());
  if (existing) return existing.id;

  const plan = await paymobRequest("/api/acceptance/subscription-plans", {
    method: "POST",
    headers,
    body: {
      frequency: 30,
      name: planName,
      reminder_days: 3,
      retrial_days: 3,
      plan_type: "merchant_subscription",
      number_of_deductions: null,
      amount_cents: premiumAmount(),
      use_transaction_amount: true,
      is_active: true,
      integration: Number(process.env.PAYMOB_MOTO_INTEGRATION_ID),
      webhook_url: process.env.PAYMOB_WEBHOOK_URL,
    },
  });
  return plan.id;
}

async function createPremiumCheckout({ user, billingData, planId }) {
  if (!process.env.PAYMOB_SECRET_KEY || !process.env.PAYMOB_3DS_INTEGRATION_ID || !process.env.PAYMOB_PUBLIC_KEY) {
    throw new Error("Paymob secret key, public key, and 3DS integration ID must be configured");
  }
  const amount = premiumAmount();
  const specialReference = `shipops-subscription-${user.id}-${Date.now()}`;
  const intention = await paymobRequest("/v1/intention/", {
    method: "POST",
    headers: { Authorization: `Token ${process.env.PAYMOB_SECRET_KEY}` },
    body: {
      amount,
      currency: premiumCurrency(),
      payment_methods: [Number(process.env.PAYMOB_3DS_INTEGRATION_ID)],
      subscription_plan_id: planId,
      items: [{ name: planName, amount, description: "Monthly ShipOps Premium subscription", quantity: 1 }],
      billing_data: billingData,
      special_reference: specialReference,
      notification_url: process.env.PAYMOB_WEBHOOK_URL,
      redirection_url: paymentSuccessUrl(),
    },
  });
  return {
    intentionId: intention.id,
    checkoutUrl: `${baseUrl()}/unifiedcheckout/?publicKey=${encodeURIComponent(process.env.PAYMOB_PUBLIC_KEY)}&clientSecret=${encodeURIComponent(intention.client_secret)}`,
  };
}

async function cancelSubscription(subscriptionId) {
  const token = await getAuthToken();
  return paymobRequest(`/api/acceptance/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export { createPremiumCheckout, ensurePremiumPlan, cancelSubscription };
