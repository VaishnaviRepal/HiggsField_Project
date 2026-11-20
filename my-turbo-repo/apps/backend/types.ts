import {z} from "zod";


// This code creates a Zod data validation schema named CreateUserSchema. It defines a strict blueprint for an object that must contain a username (which must be a string) and a password (which must also be a string).


//Exporting object as the validator 
export const CreateUserSchema = z.object({
    username : z.string(),
    password : z.string()
})

export const CreateAvatarSchema  = z.object({
    name : z.string(),
    // images : z.array(z.string())
    image : z.string()
})