import { verifyAuthToken } from "@/lib/utils/authutils";
import { handleApiError } from "@/lib/utils/error";
import { validateData } from "@/lib/utils/validation";
import { getJornadasByImportacion } from "@/services/jornada/service.jornada";
import { NextRequest, NextResponse } from "next/server";

type getImportacionJornadasURL = {
    pagina: number,
    filasPorPagina: number,
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const { id: id_importacion } = await params;
        const url = new URL(request.url);

        const data = {
            pagina: Number(url.searchParams.get("pagina")),
            filasPorPagina: Number(url.searchParams.get("filasPorPagina"))
        };

        const validation = validateData<getImportacionJornadasURL>(data, [
            { field: 'pagina', required: true, type: 'number', min: 0 },
            { field: 'filasPorPagina', required: true, type: 'number' }
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        const respuesta = await getJornadasByImportacion({
            ...validation.data,
            id_importacion
        });

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        return handleApiError(error, 'GET /api/importacion/[id]/jornadas');
    };
};