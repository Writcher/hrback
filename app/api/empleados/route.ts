"use server"

import { verifyAuthToken } from "@/lib/utils/authutils";
import { getEmpleados } from "@/services/empleado/service.empleado";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const url = new URL(request.url);
        const busquedaNombre = url.searchParams.get("busquedaNombre");
        const filtroProyecto = Number(url.searchParams.get("filtroProyecto"));
        const pagina = Number(url.searchParams.get("pagina"));
        const filasPorPagina = Number(url.searchParams.get("filasPorPagina"));
        const ordenColumna = url.searchParams.get("ordenColumna");
        const ordenDireccion = url.searchParams.get("ordenDireccion");

        if (
            busquedaNombre === null ||
            ordenColumna === null ||
            ordenDireccion === null ||
            isNaN(filtroProyecto) ||
            isNaN(pagina) ||
            isNaN(filasPorPagina)
        ) {
            return new Response(
                JSON.stringify({ error: 'Faltan parametros' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        };

        const getEmpleadosParametros = {
            busquedaNombre,
            filtroProyecto,
            pagina,
            filasPorPagina,
            ordenColumna,
            ordenDireccion
        };

        const respuesta = await getEmpleados(getEmpleadosParametros);

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error buscando empleados:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    };
};