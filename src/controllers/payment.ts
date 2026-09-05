import axios from "axios";
import { Request , Response } from "express";
import { razorpay } from "../config/razorpay";
import { verifyRazorpaySignature } from "../config/verifyRazorpay";
import { publishPaymentSuccess } from "../config/paymentProducer";


export const createRazorpayOrder = async (req: Request, res: Response) => {
    const { orderId } = req.body;

    const url = `${process.env.RESTAURANT_SERVICE}/api/order/payment/${orderId}`;

    console.log("Calling URL:", url);
    console.log("Order ID:", orderId);

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

export const verifyRazorpayPayment = async(req : Request , res : Response) => {
    const {razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        orderId
    } = req.body;

    const isValid = verifyRazorpaySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    );

    if(!isValid){
        return res.status(400).json({
            msg : "Payment verification failed"
        });
    }

    await publishPaymentSuccess({
        orderId ,
        paymentId : razorpay_payment_id,
        provider : 'razorpay'
    });

    res.json({
        msg : "Payment verified successfully"
    })
}