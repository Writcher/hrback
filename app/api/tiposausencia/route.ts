import { verifyAuthToken } from "@/lib/utils/authutils";
import { getTiposAusencia, getTiposAusenciaABM } from "@/services/tipoausencia/service.tipoausencia";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const url = new URL(request.url);

        const pagina = Number(url.searchParams.get("pagina"));
        const filasPorPagina = Number(url.searchParams.get("filasPorPagina"));
        const accion = url.searchParams.get("accion");

        if (accion === "abm") {
            const getTiposAusenciaABMParametros = {
                pagina,
                filasPorPagina
            };

            const respuesta = await getTiposAusenciaABM(getTiposAusenciaABMParametros);

            return NextResponse.json(respuesta, { status: 200 });
        };

        const respuesta = await getTiposAusencia();

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error buscando tipos de jornada:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    };
};