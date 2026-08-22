import express from "express";
import authenticate from "../middleware/authenticate.js";
import { cancelCurrentSubscription, chooseFreePlan, getSubscription, paymobWebhook, startPremiumCheckout } from "../controllers/subscription.controller.js";

const subscriptionRoutes = express.Router();

subscriptionRoutes.post("/api/paymob/webhook", paymobWebhook);
subscriptionRoutes.get("/api/subscription", authenticate, getSubscription);
subscriptionRoutes.post("/api/subscription/free", authenticate, chooseFreePlan);
subscriptionRoutes.post("/api/subscription/premium/checkout", authenticate, startPremiumCheckout);
subscriptionRoutes.post("/api/subscription/cancel", authenticate, cancelCurrentSubscription);

export default subscriptionRoutes;
