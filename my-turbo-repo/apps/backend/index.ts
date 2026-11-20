import express from "express";
//CHANGE THIS (Looking in node_modules, causing the error):
// import { PrismaClient } from '@prisma/client'

import { createImage} from "./image";
 
//  WITH THIS (Points directly to your custom generated folder):
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;


// const prisma = new PrismaClient();
const app = express();
app.use(express.json());

import { uuid } from "uuidv4";
import axios from "axios";  
import {z} from "zod";
import {CreateUserSchema , CreateAvatarSchema} from "./types";

// //AI api key for creating avatar
// const GoogleGenAI = (require("@google/genai") as {
//     GoogleGenAI: new (options: {
//         apiKey?: string;
//         httpOptions?: { apiVersion?: string };
//     }) => any;
// }).GoogleGenAI;

import * as fs from "fs";
//Explicitly set the apiVersion to 'v1beta' inside httpOptions
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY,
    httpOptions: {
        apiVersion: "v1beta" //  This forces the v1beta endpoint route cleanly
    }
});


// 1. Structure the configuration array safely so it is easy to map over
const avatarPrompts = [
    {
        id: uuid(),
        profile: "leftProfile",
        text: `Maintain the exact facial identity, features, and likeness of the reference image, transforming it into a high-resolution, photorealistic corporate profile avatar. Composition & Style: Left-side chest-up profile headshot in a softly blurred, off-white studio office background with cinematic lighting and professional corporate attire.`
    },
    {
        id: uuid(),
        profile: "rightProfile",
        text: `Maintain the exact facial identity, features, and likeness of the reference image, transforming it into a high-resolution, photorealistic corporate profile avatar. Composition & Style: Right-side chest-up profile headshot in a softly blurred, off-white studio office background with cinematic lighting and professional corporate attire.`
    },
    {
        id: uuid(),
        profile: "frontProfile",
        text: `Maintain the exact facial identity, features, and likeness of the reference image, transforming it into a high-resolution, photorealistic corporate profile avatar. Composition & Style: Front-side chest-up profile headshot in a softly blurred, off-white studio office background with cinematic lighting and professional corporate attire.`
    }
];

// = ========================================
// 1. User Endpoints

app.post("/api/v1/signup",async  (req,res)=>{
    
    // Pass the data to the validator of zod 
    const {success, data} = CreateUserSchema.safeParse(req.body);
    if(!success){
        res.status(422).json({
            message : "Incorrect credentails"
        })
        return;
    }
    const user = await prisma.user.create({
        data : {
            username : req.body.username,
            password: req.body.password
        }
    })


    res.json({
        id: user.id
    });
})

app.post("/api/v1/signin", (req, res) => {
    res.json({"Status": "200"});
});

app.get("/api/v1/me", (req, res) => {
    res.json({"Status": "200"});
});

//=========================================
// 2. Video Endpoints
// ==========================================

app.post("/api/v1/video", (req, res) => {
    res.json({"Status": "200"});
});

app.get("/api/v1/video/:videoId", (req, res) => {
    res.json({"Status": "200"});
});

app.get("/api/v1/videos", (req, res) => {
    res.json({"Status": "200"});
});

// ==========================================
// 3. Avatar Endpoints
// ==========================================

app.post("/api/v1/avatar", async (req, res) => {

    // Validate request data (expects name and image URL from body)
    const { success, data } = CreateAvatarSchema.safeParse(req.body);
    if (!success) {
        res.status(411).json({ message: "Incorrect data" });
        return;
    }

    try {
        // Mock hardcoded userId for validation testing (Replace with your actual req.userId session middleware)
        const activeUserId = "YOUR_LOGGED_IN_USER_UUID"; 

        // Step 1: Pre-generate a single main Avatar entry UUID string 
        const mainAvatarId = uuid();

        // Step 2: Fetch the user's reference image and convert it into base64
        const imageResponse = await axios.get(data.image, { responseType: "arraybuffer" });
        const contentTypeHeader = imageResponse.headers["content-type"];
        const contentType = typeof contentTypeHeader === "string"
            ? contentTypeHeader.split(";")[0]
            : "";
        const supportedMimeTypes = ["image/png", "image/jpeg", "image/webp"] as const;
        const detectedMimeType = supportedMimeTypes.includes(contentType as typeof supportedMimeTypes[number])
            ? contentType as typeof supportedMimeTypes[number]
            : "image/png";
        const base64ReferenceImage = Buffer.from(imageResponse.data, "binary").toString("base64");

        // Step 3: Use Promise.all to fire off all 3 Gemini API generation pipelines simultaneously
        const generationPromises = avatarPrompts.map(async (promptConfig) => {
            const interaction = await ai.interactions.create({
                model: "gemini-nano-banana-2.1",
                input: [
                    { type: "text", text: promptConfig.text },
                    { type: "image", mime_type: detectedMimeType, data: base64ReferenceImage },
                ],
            });

            const generatedImage = interaction.output_image;
            let outputUrl = "https://your-cloud-storage.com";

            if (generatedImage && generatedImage.data) {
                const buffer = Buffer.from(generatedImage.data, "base64");
                const localPath = `./assets/${promptConfig.id}.png`;
                fs.writeFileSync(localPath, buffer);
                outputUrl = localPath; // In production, upload this buffer to S3 / Cloudinary and use that URL
            }

            return {
                id: promptConfig.id,
                profileType: promptConfig.profile,
                url: outputUrl
            };
        });

        // Resolve all parallel generations together
        const generatedOutputs = await Promise.all(generationPromises);

        // Step 4: Write everything to your Prisma Database in a single structured transaction block
        const databaseRecord = await prisma.avatar.create({
            data: {
                id: mainAvatarId,
                userId: activeUserId,
                name: data.name,
                avatarImages: {
                    create: [
                        // Map the user's initial raw reference image input entry
                        {
                            id: uuid(),
                            type: "User",
                            url: data.image
                        },
                        // Spread out the 3 new generated multi-angle portfolio outputs seamlessly 
                        ...generatedOutputs.map(output => ({
                            id: output.id,
                            type: "Model" as const,
                            url: output.url
                        }))
                    ]
                }
            },
            include: {
                avatarImages: true
            }
        });

        // Step 5: Send the complete database record array payload back to Postman cleanly
        res.status(200).json({
            message: "Multi-angle corporate avatars successfully generated!",
            avatar: databaseRecord
        });

    } catch (error: any) {
        console.error("Avatar Generation Failure:", error);
        res.status(500).json({
            message: "An internal crash occurred during AI generation",
            error: error.message
        });
    }
});

app.get("/api/v1/avatar/:avatarId", (req, res) => {
    res.json({"Status": "200"});
});

app.get("/api/v1/avatars", (req, res) => {
    res.json({"Status": "200"});
});

// ==========================================
// 4. Model Endpoints
// ==========================================

app.get("/api/v1/models", (req, res) => {
    res.json({"Status": "200"});
});

// ==========================================
// Server Activation
// ==========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});