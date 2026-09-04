import axios from "axios";
import { Request , Response } from "express";
import { razorpay } from "../config/razorpay";
import { verifyRazorpaySignature } from "../config/verifyRazorpay";
import { publishPaymentSuccess } from "../config/paymentProducer";

export const createRazorpayOrder = async(req:Request , res:Response) => {
    const {orderId} = req.body;

    const {data} = await axios.get(
        `${process.env.RESTAURANT_SERVICE}/api/order/payment/${orderId}`,
        {
            headers : {
                "x-internal-key" : process.env.INTERNAL_SERVICE_KAY
            }
        }     
    );

    const razorpayOrder = await razorpay.orders.create({
        amount : data.amount * 100,
        currency : 'INR',
        receipt : orderId
    });

    res.json({
        razorpayOrderId : razorpayOrder.id,
        key : process.env.RAZORPAY_KEY_SECRET
    });
}

export const verifyRazorpayPayment = async(req : Request , res : Response) => {
    const {razorpay_order_id ,
        razorpay_paymet_id ,
        razorpay_signature,
        orderId
    } = req.body;

    const isValid = verifyRazorpaySignature(
        razorpay_order_id,
        razorpay_paymet_id,
        razorpay_signature
    );

    if(!isValid){
        return res.status(400).json({
            msg : "Payment verification failed"
        });
    }

    await publishPaymentSuccess({
        orderId ,
        paymentId : razorpay_paymet_id,
        provider : 'razorpay'
    });

    res.json({
        msg : "Payment verified successfully"
    })
}