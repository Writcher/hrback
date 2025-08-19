"use server"

import { getImportaciones } from '@/services/importacion/service.importacion';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const filtroIncompletas = url.searchParams.get("filtroIncompletas") === "true";
        const filtroProyecto = Number(url.searchParams.get("filtroProyecto"));
        const pagina = Number(url.searchParams.get("pagina"));
        const filasPorPagina = Number(url.searchParams.get("filasPorPagina"));

        if (
            isNaN(filtroProyecto) ||
            isNaN(pagina) ||
            isNaN(filasPorPagina)
        ) {
            return new Response(
                JSON.stringify({ error: 'Faltan parametros' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        };

        const getImportacionesParametros = {
            filtroIncompletas,
            filtroProyecto,
            pagina,
            filasPorPagina
        };

        const respuesta = await getImportaciones(getImportacionesParametros);

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error buscando jornadas:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    };
};