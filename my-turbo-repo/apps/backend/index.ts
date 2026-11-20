import express from "express";
const PrismaClient = (require("@prisma/client") as {
    PrismaClient: new () => any;
}).PrismaClient;

const prisma = new PrismaClient();
const app = express();

app.post("/api/v1/signup",async  (req,res)=>{
    
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

app.post("/api/v1/avatar", (req, res) => {
    res.json({"Status": "200"});
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

// app.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
// });