import * as fs from "node:fs";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function createImage(userprompt : string , imageUrl : string, outputFilePath : string){

    //The below axios func is for getting image using axios and convert it into ase64 : from stack overflow docs
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }
                                
        // 2. Extract the actual Mime Type (e.g. image/jpeg, image/png) dynamic value
        const imageMimeTypes = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"] as const;
        const responseMimeType = imageResponse.headers.get("content-type");
        const detectedMimeType = imageMimeTypes.find(
            (mimeType) => mimeType === (typeof responseMimeType === "string" ? responseMimeType.split(";")[0] : undefined)
        ) ?? "image/png";
        const base64Image = Buffer.from(await imageResponse.arrayBuffer()).toString("base64");
    
        //The below code is text to image and image code from gemini docs 
        // const imagePath = "path/to/cat_image.png";
        // const imageData = fs.readFileSync(imagePath);
        // const base64Image = imageData.toString("base64");//these 3 lines commented cz worked on it using axios above 
    
        const interaction = await ai.interactions.create({
            model: "gemini-nano-banana-2.1",
            input: [
                { type: "text", text: userprompt },
                {
                    type: "image",
                    mime_type: detectedMimeType,
                    data: base64Image
                },
            ],
        });
        const generatedImage = interaction.output_image;
        if (generatedImage) {
            if (generatedImage && generatedImage.data) {
                const buffer = Buffer.from(generatedImage.data, "base64");
                fs.writeFileSync(outputFilePath, buffer);
            }
            console.log(`Image saved as ${outputFilePath}`);
        }
    
}