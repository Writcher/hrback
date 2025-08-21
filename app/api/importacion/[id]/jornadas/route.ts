"use server"

import { verifyAuthToken } from "@/lib/utils/authutils";
import { getImportacionJornadas } from "@/services/jornada/service.jornada";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const { id: id_importacion } = await params;
        const url = new URL(request.url);
        const filtroMarcasIncompletas = url.searchParams.get("filtroMarcasIncompletas") === "true";
        const pagina = Number(url.searchParams.get("pagina"));
        const filasPorPagina = Number(url.searchParams.get("filasPorPagina"));

        if (
            isNaN(pagina) ||
            isNaN(filasPorPagina)
        ) {
            return new Response(
                JSON.stringify({ error: 'Faltan parametros' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        };

        const getImportacionJornadasParametros = {
            id_importacion,
            filtroMarcasIncompletas,
            pagina,
            filasPorPagina
        };

        const respuesta = await getImportacionJornadas(getImportacionJornadasParametros);

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error buscando jornadas: ", error);
        return NextResponse.json({ error: "Error interno" });
    };
};