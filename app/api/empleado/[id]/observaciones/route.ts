import { verifyAuthToken } from '@/lib/utils/authutils';
import { getObservacionesResumen } from '@/services/observacion/service.observacion';
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
        const paginaParam = url.searchParams.get("pagina");
        const filasParam = url.searchParams.get("filasPorPagina");

        const pagina = Number(paginaParam);
        const filasPorPagina = Number(filasParam);

        if (isNaN(filtroMes) || isNaN(filtroQuincena) || isNaN(pagina) || isNaN(filasPorPagina)) {
            return new Response(
                JSON.stringify({ error: 'Faltan parametros' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        };

            const getEmpleadoJornadasParametros = {
                id_empleado: Number(id_empleado),
                filtroMes,
                filtroQuincena,
                pagina,
                filasPorPagina
            };

            const respuesta = await getObservacionesResumen(getEmpleadoJornadasParametros);

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error buscando jornadas:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    };
};