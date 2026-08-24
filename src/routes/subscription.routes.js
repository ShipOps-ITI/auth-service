import express from "express";
import authenticate from "../middleware/authenticate.js";
import { cancelCurrentSubscription, confirmPremiumPayment, getSubscription, paymobWebhook, startPremiumCheckout, startTrial } from "../controllers/subscription.controller.js";

const subscriptionRoutes = express.Router();

subscriptionRoutes.post("/paymob/webhook", paymobWebhook);
subscriptionRoutes.get("/subscription", authenticate, getSubscription);
subscriptionRoutes.post("/subscription/trial", authenticate, startTrial);
subscriptionRoutes.post("/subscription/premium/checkout", authenticate, startPremiumCheckout);
subscriptionRoutes.post("/subscription/premium/confirm", authenticate, confirmPremiumPayment);
subscriptionRoutes.post("/subscription/cancel", authenticate, cancelCurrentSubscription);

export default subscriptionRoutes;
