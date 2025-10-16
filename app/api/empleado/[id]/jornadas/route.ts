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
        const ausencias = url.searchParams.get("ausencias") === "true";
        const filtroTipoAusencia = Number(url.searchParams.get("filtroTipoAusencia"));
        
        const paginaParam = url.searchParams.get("pagina");
        const filasParam = url.searchParams.get("filasPorPagina");
        
        if (isNaN(filtroMes) || isNaN(filtroQuincena)) {
            return new Response(
                JSON.stringify({ error: 'Faltan parametros' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        };

        let respuesta;
        
        if (paginaParam && paginaParam !== '' && filasParam && filasParam !== '') {

            const pagina = Number(paginaParam);
            
            const filasPorPagina = Number(filasParam);
            
            if (isNaN(pagina) || isNaN(filasPorPagina) || isNaN(filtroTipoAusencia)) {
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
                filasPorPagina,
                ausencias,
                filtroTipoAusencia,
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