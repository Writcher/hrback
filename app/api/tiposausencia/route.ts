import { verifyAuthToken } from "@/lib/utils/authutils";
import { handleApiError } from "@/lib/utils/error";
import { validateData } from "@/lib/utils/validation";
import { getTiposAusencia, getTiposAusenciaABM } from "@/services/tipoausencia/service.tipoausencia";
import { NextRequest, NextResponse } from "next/server";

type getTiposAusenciaURL = {
    accion: string,
};

type abmData = {
    pagina: number,
    filasPorPagina: number,
};
export async function GET(request: NextRequest) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const url = new URL(request.url);

        const validation = validateData<getTiposAusenciaURL>({
            accion: url.searchParams.get('accion')
        }, [
            { field: 'accion', required: true, type: 'string' }
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        if (validation.data.accion === "abm") {

            const abmValidation = validateData<abmData>({
                pagina: Number(url.searchParams.get("pagina")),
                filasPorPagina: Number(url.searchParams.get("filasPorPagina"))
            }, [
                { field: 'pagina', required: true, type: 'number', min: 0 },
                { field: 'filasPorPagina', required: true, type: 'number' }
            ]);

            if (!abmValidation.valid) {
                throw abmValidation.error;
            };

            const respuesta = await getTiposAusenciaABM({
                pagina: abmValidation.data.pagina,
                filasPorPagina: abmValidation.data.filasPorPagina
            });

            return NextResponse.json(respuesta, { status: 200 });
        } else if (validation.data.accion === 'select') {

            const respuesta = await getTiposAusencia();

            return NextResponse.json(respuesta, { status: 200 });
        };
    } catch (error) {
        return handleApiError(error, 'GET /api/tiposausencia');
    };
};//