import { verifyAuthToken } from "@/lib/utils/authutils";
import { handleApiError } from "@/lib/utils/error";
import { validateData } from "@/lib/utils/validation";
import { insertJornadaObservacion } from "@/services/jornadaobservacion/service.jornadaobservacion";
import { insertObservacion } from "@/services/observacion/service.observacion";
import { NextRequest, NextResponse } from "next/server";

type insertObservacionBody = {
    observacion: string,
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const { id: id_jornada } = await params;
        const body = await request.json();

        const validation = validateData<insertObservacionBody>(body, [
            { field: 'observacion', required: true, type: 'string' }
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        const id_observacion = await insertObservacion({
            ...validation.data
        });

        await insertJornadaObservacion({ 
            id_jornada, 
            id_observacion 
        });

        return NextResponse.json({ message: "Observacion creada." }, { status: 201 });
    } catch (error) {
        return handleApiError(error, 'POST /api/jornada/[id]/observacion');
    };
};//
