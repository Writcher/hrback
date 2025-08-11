"use server"

import { getEmpleadoJornadas } from '@/services/jornada/service.jornada';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idEmpleado } = await params;
        const url = new URL(request.url);
        const filtroMes = Number(url.searchParams.get("filtroMes"));
        const filtroQuincena = Number(url.searchParams.get("filtroQuincena"));
        const filtroMarcasIncompletas = url.searchParams.get("filtroMarcasIncompletas") === "true";
        const pagina = Number(url.searchParams.get("pagina"));
        const filasPorPagina = Number(url.searchParams.get("filasPorPagina"));

        if (
            isNaN(filtroMes) ||
            isNaN(filtroQuincena) ||
            isNaN(pagina) ||
            isNaN(filasPorPagina)
        ) {
            return new Response(
                JSON.stringify({ error: 'Faltan parametros' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        };

        const getEmpleadoJornadasParams = {
            idEmpleado: Number(idEmpleado),
            filtroMes,
            filtroQuincena,
            filtroMarcasIncompletas,
            pagina,
            filasPorPagina
        };

        const respuesta = await getEmpleadoJornadas(getEmpleadoJornadasParams);

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error buscando jornadas:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    };
};