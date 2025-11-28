import { verifyAuthToken } from "@/lib/utils/authutils";
import { handleApiError } from "@/lib/utils/error";
import { validateData } from "@/lib/utils/validation";
import { createTipoAusencia } from "@/services/tipoausencia/service.tipoausencia";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const body = await request.json();

        const validation = validateData<{ nombre: string }>(body, [
            { field: 'nombre', required: true, type: 'string' }
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        await createTipoAusencia({
            ...validation.data
        });

        return NextResponse.json({ message: "Tipo de Ausencia creado." }, { status: 201 });
    } catch (error) {
        return handleApiError(error, 'POST /api/tipoausencia');
    };
};//
