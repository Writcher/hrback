import { verifyAuthToken } from '@/lib/utils/authutils';
import { handleApiError } from '@/lib/utils/error';
import { validateData } from '@/lib/utils/validation';
import { getEmpleadoJornadas, getEmpleadoJornadasResumen } from '@/services/jornada/service.jornada';
import { NextRequest, NextResponse } from 'next/server';

type getEmpleadoJornadasURL = {
    filtroMes: number,
    filtroQuincena: number,
    filtroTipoAusencia: number,
    filtroMarcasIncompletas: boolean,
    ausencias: boolean,
};

type paginacionData = {
    pagina: number,
    filasPorPagina: number,
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const url = new URL(request.url);
        const { id: id_empleado } = await params;

        const data = {
            filtroMes: Number(url.searchParams.get("filtroMes")),
            filtroQuincena: Number(url.searchParams.get("filtroQuincena")),
            filtroTipoAusencia: Number(url.searchParams.get("filtroTipoAusencia")),
            filtroMarcasIncompletas: url.searchParams.get("filtroMarcasIncompletas") === "true",
            ausencias: url.searchParams.get("ausencias") === "true",

        };

        const pagina = url.searchParams.get("pagina");
        const filasPorPagina = url.searchParams.get("filasPorPagina");

        const validation = validateData<getEmpleadoJornadasURL>(data, [
            { field: 'filtroMes', required: true, type: 'number' },
            { field: 'filtroQuincena', required: true, type: 'number' },
            { field: 'filtroTipoAusencia', required: true, type: 'number' },
            { field: 'filtroMarcasIncompletas', required: true, type: 'boolean' },
            { field: 'ausencias', required: true, type: 'boolean' },
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        let respuesta;

        if (pagina !== '' && filasPorPagina !== '') {

            const dataPaginacion = {
                pagina: Number(pagina),
                filasPorPagina: Number(filasPorPagina),
            };

            const validationPaginacion = validateData<paginacionData>(dataPaginacion, [
                { field: 'pagina', required: true, type: 'number' },
                { field: 'filasPorPagina', required: true, type: 'number' },
            ]);

            if (!validationPaginacion.valid) {
                throw validationPaginacion.error;
            };

            respuesta = await getEmpleadoJornadas({
                ...validation.data,
                ...validationPaginacion.data,
                id_empleado: Number(id_empleado)
            });
        } else {

            respuesta = await getEmpleadoJornadasResumen({
                id_empleado: Number(id_empleado),
                filtroMes: validation.data.filtroMes,
                filtroQuincena: validation.data.filtroQuincena
            });

        };

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        return handleApiError(error, 'GET /api/empleado/[id]/jornadas');
    };
};//