"use server"

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

type JWTPayload = {
    id: string;
    correo: string;
    tipoUsuario: string;
    exp: number;
};

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
        const decoded = jwt.verify(token, SECRET);

        if (typeof decoded === 'string') {
            throw new Error('Token inválido');
        };

        const payload = decoded as JWTPayload;

        return { error: null, payload };
    } catch (error) {
        console.error("Error verificando token: ", error);
        return {
            error: NextResponse.json({ error: "Token inválido" }, { status: 401 }),
            payload: null as JWTPayload | null
        };
    };
};