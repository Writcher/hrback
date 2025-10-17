import { verifyAuthToken } from "@/lib/utils/authutils";
import { getMeses } from "@/services/mes/service.mes";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const respuesta = await getMeses();

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error buscando meses:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    };
};