import express from 'express';
import cloudinary from 'cloudinary';

const router = express.Router();

router.post('/upload' , async(req , res) => {
    try {
        const {buffer} = req.body;
        const cloud = await cloudinary.v2.uploader.upload(buffer);

        res.status(200).json({
            url : cloud.secure_url
        })
    } catch (error : any) {
        res.status(500).json({
            msg : error.message
        })
    }
})

export default router;