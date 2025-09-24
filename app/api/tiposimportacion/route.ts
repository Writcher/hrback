"use server";

import { verifyAuthToken } from "@/lib/utils/authutils";
import { getTiposImportacion } from "@/services/tipoimportacion/service.tipoimportacion";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const respuesta = await getTiposImportacion();

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error buscando tipos de importacion: ", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    };
};