import { verifyAuthToken } from "@/lib/utils/authutils";
import { getControles } from "@/services/control/service.control";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const url = new URL(request.url);

        const pagina = Number(url.searchParams.get("pagina"));
        const filasPorPagina = Number(url.searchParams.get("filasPorPagina"));

        const getControlesParametros = {
            pagina,
            filasPorPagina
        };

        const respuesta = await getControles(getControlesParametros);

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error buscando controles:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    };
};