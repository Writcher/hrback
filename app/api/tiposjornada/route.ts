import { verifyAuthToken } from "@/lib/utils/authutils";
import { getTiposJornada } from "@/services/tipojornada/service.tipojornada";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;
    
    try {
        const respuesta = await getTiposJornada();
        
        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error buscando tipos de jornada:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    };
};