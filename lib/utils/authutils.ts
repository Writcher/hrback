"use server"

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const SECRET = process.env.AUTH_SECRET!;

export async function verifyAuthToken(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader?.startsWith("Bearer ")) {
        return { 
            error: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
            payload: null 
        };
    };

    const token = authHeader.split(" ")[1];

    try {
        const payload = jwt.verify(token, SECRET);
        return { error: null, payload };
    } catch (error) {
        console.error("Error verificando token:", error);
        return { 
            error: NextResponse.json({ error: "Token inválido" }, { status: 401 }),
            payload: null 
        };
    };
};