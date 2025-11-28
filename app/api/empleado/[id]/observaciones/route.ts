import { verifyAuthToken } from '@/lib/utils/authutils';
import { validateData } from '@/lib/utils/validation';
import { handleApiError } from "@/lib/utils/error";
import { getObservacionesResumen } from '@/services/observacion/service.observacion';
import { NextRequest, NextResponse } from 'next/server';

type getEmpleadoJornadaObservacionesURL = {
    filtroMes: number,
    filtroQuincena: number,
    pagina: number,
    filasPorPagina: number,
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const { id: id_empleado } = await params;
        const url = new URL(request.url);

        const data = {
            filtroMes: Number(url.searchParams.get("filtroMes")),
            filtroQuincena: Number(url.searchParams.get("filtroQuincena")),
            pagina: Number(url.searchParams.get("pagina")),
            filasPorPagina: Number(url.searchParams.get("filasPorPagina")),
        };

        const validation = await validateData<getEmpleadoJornadaObservacionesURL>(data, [
            { field: 'filtroMes', required: true, type: 'number' },
            { field: 'filtroQuincena', required: true, type: 'number' },
            { field: 'pagina', required: true, type: 'number', min: 0 },
            { field: 'filasPorPagina', required: true, type: 'number' }
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        const respuesta = await getObservacionesResumen({
            ...validation.data,
            id_empleado: Number(id_empleado),
        });

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        return handleApiError(error, 'GET /api/empleado/[id]/observaciones');
    };
};