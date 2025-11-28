import { verifyAuthToken } from '@/lib/utils/authutils';
import { handleApiError } from '@/lib/utils/error';
import { validateData } from '@/lib/utils/validation';
import { getImportaciones } from '@/services/importacion/service.importacion';
import { NextRequest, NextResponse } from 'next/server';

type getImportacionesURL = {
    filtroIncompletas: boolean,
    filtroProyecto: number,
    pagina: number,
    filasPorPagina: number,
};

export async function GET(request: NextRequest) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const url = new URL(request.url);

        const data = {
            filtroIncompletas: url.searchParams.get("filtroIncompletas") === "true",
            filtroProyecto: Number(url.searchParams.get("filtroProyecto")),
            pagina: Number(url.searchParams.get("pagina")),
            filasPorPagina: Number(url.searchParams.get("filasPorPagina")),
        };

        const validation = validateData<getImportacionesURL>(data, [
            { field: 'pagina', required: true, type: 'number', min: 0 },
            { field: 'filasPorPagina', required: true, type: 'number' },
            { field: 'filtroProyecto', required: true, type: 'number' },
            { field: 'filtroIncompletas', required: true, type: 'boolean' }
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        const respuesta = await getImportaciones({
            ...validation.data
        });

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        return handleApiError(error, 'GET /api/importaciones');
    };
};//