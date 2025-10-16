import { verifyAuthToken } from "@/lib/utils/authutils";
import { getTiposAusencia } from "@/services/tipoausencia/service.tipoausencia";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const respuesta = await getTiposAusencia();

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error buscando tipos de jornada:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    };
};