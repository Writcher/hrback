"use server"
import { verifyAuthToken } from '@/lib/utils/authutils';
import { getEmpleadoJornadas, getEmpleadoJornadasResumen } from '@/services/jornada/service.jornada';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: number }> }
) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const { id: id_empleado } = await params;
        const url = new URL(request.url);
        const filtroMes = Number(url.searchParams.get("filtroMes"));
        const filtroQuincena = Number(url.searchParams.get("filtroQuincena"));
        const filtroMarcasIncompletas = url.searchParams.get("filtroMarcasIncompletas") === "true";
        
        const paginaParam = url.searchParams.get("pagina");
        const filasParam = url.searchParams.get("filasPorPagina");

        console.log(paginaParam)
        console.log(filasParam)
        
        // Validar parámetros básicos
        if (isNaN(filtroMes) || isNaN(filtroQuincena)) {
            return new Response(
                JSON.stringify({ error: 'Faltan parametros' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        };

        let respuesta;
        
        // Verificar si se pasaron parámetros de paginación válidos
        if (paginaParam && paginaParam !== '' && filasParam && filasParam !== '') {
            const pagina = Number(paginaParam);
            const filasPorPagina = Number(filasParam);
            
            // Validar que los parámetros de paginación sean números válidos
            if (isNaN(pagina) || isNaN(filasPorPagina)) {
                return new Response(
                    JSON.stringify({ error: 'Parámetros de paginación inválidos' }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            };

            const getEmpleadoJornadasParametros = {
                id_empleado: Number(id_empleado),
                filtroMes,
                filtroQuincena,
                filtroMarcasIncompletas,
                pagina,
                filasPorPagina
            };
            respuesta = await getEmpleadoJornadas(getEmpleadoJornadasParametros);
        } else {
            const getEmpleadoJornadasResumenParametros = {
                id_empleado: Number(id_empleado),
                filtroMes,
                filtroQuincena
            };
            respuesta = await getEmpleadoJornadasResumen(getEmpleadoJornadasResumenParametros);
        };

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error buscando jornadas:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    };
};