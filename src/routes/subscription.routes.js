import express from "express";
import authenticate from "../middleware/authenticate.js";
import { cancelCurrentSubscription, getSubscription, paymobWebhook, startPremiumCheckout, startTrial } from "../controllers/subscription.controller.js";

const subscriptionRoutes = express.Router();

subscriptionRoutes.post("/api/paymob/webhook", paymobWebhook);
subscriptionRoutes.get("/api/subscription", authenticate, getSubscription);
subscriptionRoutes.post("/api/subscription/trial", authenticate, startTrial);
subscriptionRoutes.post("/api/subscription/premium/checkout", authenticate, startPremiumCheckout);
subscriptionRoutes.post("/api/subscription/cancel", authenticate, cancelCurrentSubscription);

export default subscriptionRoutes;
