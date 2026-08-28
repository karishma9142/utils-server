import express from 'express';
import cloudinary from 'cloudinary';

const router = express.Router();

router.post('/upload', async (req, res) => {
    try {
        const { buffer } = req.body;
        const cloud = await cloudinary.v2.uploader.upload(buffer);
        console.log(buffer);
        res.status(200).json({
            url: cloud.secure_url
        })
    } catch (error: any) {
        console.error('FULL CLOUDINARY ERROR:', JSON.stringify(error, null, 2));
        const status = error.http_code || 500;
        res.status(status).json({ msg: error.message });

    }
})

export default router;