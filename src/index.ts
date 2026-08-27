import express from 'express';
import dotenv from 'dotenv';
import cloudnary from 'cloudinary';
import cors from 'cors';
import uploadRoutes from './routes/cloudinary.js'

dotenv.config();
const app = express ();
app.use(cors());

app.use(express.json({limit : "50mb"}));
app.use(express.urlencoded({limit : "50mb" , extended:true}));


const {CLOUD_NAME ,CLOUD_API_KEY ,CLOUD_API_SECRET } = process.env;

if(!CLOUD_API_KEY || !CLOUD_API_SECRET || !CLOUD_NAME){
    throw new Error('Missing Cloudinary enviroment variable');
}

cloudnary.v2.config({
    cloud_name : CLOUD_NAME,
    api_key : CLOUD_API_KEY,
    api_secret : CLOUD_API_SECRET
})

app.use('/api' ,uploadRoutes);
const PORT = process.env.PORT || 3002;

app.listen(PORT , ()=> {
    console.log(`Utils server is running on ${PORT}`);
})