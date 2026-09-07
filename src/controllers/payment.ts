import axios from "axios";
import { Request, Response } from "express";
import { razorpay } from "../config/razorpay";
import { verifyRazorpaySignature } from "../config/verifyRazorpay";
import { publishPaymentSuccess } from "../config/paymentProducer";


export const createRazorpayOrder = async (req: Request, res: Response) => {
    const { orderId } = req.body;

    const url = `${process.env.RESTAURANT_SERVICE}/api/order/payment/${orderId}`;

    // console.log("Calling URL:", url);
    // console.log("Order ID:", orderId);

    try {
        const { data } = await axios.get(url, {
            headers: {
                "x-internal-key": process.env.INTERNAL_SERVICE_KAY
            }
        });

        console.log("Restaurant response:", data);

        const razorpayOrder = await razorpay.orders.create({
            amount: data.amount * 100,
            currency: "INR",
            receipt: orderId
        });

        return res.json({
            razorpayOrderId: razorpayOrder.id,
            key: process.env.RAZORPAY_KEY_ID
        });

    } catch (error: any) {
        console.log("========== AXIOS ERROR ==========");
        console.log("URL:", error.config?.url);
        console.log("Status:", error.response?.status);
        console.log("Response:", error.response?.data);
        console.log("=================================");

        return res.status(error.response?.status || 500).json({
            msg: error.response?.data?.msg || "Failed to create payment"
        });
    }
};

export const verifyRazorpayPayment = async (req: Request, res: Response) => {
    const { razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        orderId
    } = req.body;

    const isValid = verifyRazorpaySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    );

    if (!isValid) {
        return res.status(400).json({
            msg: "Payment verification failed"
        });
    }

    await publishPaymentSuccess({
        orderId,
        paymentId: razorpay_payment_id,
        provider: 'razorpay'
    });

    res.json({
        msg: "Payment verified successfully"
    })
};

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_KEY_SECRET!);

export const payWithStripe = async (
    req: Request,
    res: Response
) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({
                msg: "Order ID is required"
            });
        }

        const url = `${process.env.RESTAURANT_SERVICE}/api/order/payment/${orderId}`;

        const { data } = await axios.get(url, {
            headers: {
                "x-internal-key": process.env.INTERNAL_SERVICE_KEY
            }
        });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],

            mode: "payment",

            line_items: [
                {
                    price_data: {
                        currency: "inr",

                        product_data: {
                            name: "Cravio Food Delivery"
                        },

                        unit_amount: Math.round(data.amount * 100)
                    },

                    quantity: 1
                }
            ],

            metadata: {
                orderId
            },

            success_url:
                `${process.env.FRONTEND_URL}/ordersuccess?session_id={CHECKOUT_SESSION_ID}`,

            cancel_url:
                `${process.env.FRONTEND_URL}/checkout`
        });

        return res.json({
            url: session.url
        });

    } catch (error) {
        console.error("Stripe payment error:", error);

        return res.status(500).json({
            msg: "Stripe payment failed"
        });
    }
};
export const verifyStripe = async (
    req: Request,
    res: Response
) => {
    const { sessionId } = req.body;

    try {
        if (!sessionId) {
            return res.status(400).json({
                msg: "Session ID is required"
            });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // IMPORTANT: Check actual payment status
        if (session.payment_status !== "paid") {
            return res.status(400).json({
                msg: "Payment verification failed"
            });
        }

        const orderId = session.metadata?.orderId;

        if (!orderId) {
            return res.status(400).json({
                msg: "Order not found in Stripe session"
            });
        }

        await publishPaymentSuccess({
            orderId,
            paymentId: session.payment_intent as string,
            provider: "stripe"
        });

        return res.json({
            msg: "Payment verified successfully"
        });

    } catch (error) {
        console.error("Stripe verification error:", error);

        return res.status(500).json({
            msg: "Stripe payment verification failed"
        });
    }
};