import { verifyAuthToken } from "@/lib/utils/authutils";
import { handleApiError } from "@/lib/utils/error";
import { validateData } from "@/lib/utils/validation";
import { getControles } from "@/services/control/service.control";
import { NextRequest, NextResponse } from "next/server";

type getControlesURL = {
    pagina: number,
    filasPorPagina: number,
};

export async function GET(request: NextRequest) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const url = new URL(request.url);

        const data = {
            pagina: Number(url.searchParams.get("pagina")),
            filasPorPagina: Number(url.searchParams.get("filasPorPagina"))
        };

        const validation = validateData<getControlesURL>(data, [
            { field: 'pagina', required: true, type: 'number', min: 0 },
            { field: 'filasPorPagina', required: true, type: 'number' }
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        const respuesta = await getControles({
            ...validation.data
        });

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        return handleApiError(error, 'GET /api/controles');
    };
};//