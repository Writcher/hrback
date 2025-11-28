import { verifyAuthToken } from "@/lib/utils/authutils";
import { handleApiError } from "@/lib/utils/error";
import { validateData } from "@/lib/utils/validation";
import { deactivateTipoAusencia, editTipoAusencia } from "@/services/tipoausencia/service.tipoausencia";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const { id: id_tipoausencia } = await params;
        const body = await request.json();

        const validation = validateData<{ accion: string }>(body, [
            { field: 'accion', required: true, type: 'string' }
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        if (validation.data.accion === "baja") {

            await deactivateTipoAusencia({
                id_tipoausencia: id_tipoausencia
            });

            return NextResponse.json({ message: "Tipo de Ausencia dado de baja correctamente." }, { status: 200 });
        } else if (validation.data.accion === "editar") {

            const editValidation = validateData<{ nombre: string }>({
                nombre: body.nombre as string
            }, [
                { field: 'nombre', required: true, type: 'string' }
            ]);

            if (!editValidation.valid) {
                throw editValidation.error;
            };

            await editTipoAusencia({
                id_tipoausencia: id_tipoausencia,
                nombre: editValidation.data.nombre,
            });

            return NextResponse.json({ message: "Tipo de Ausencia editado correctamente." }, { status: 200 });
        };
    } catch (error) {
        return handleApiError(error, 'PATCH /api/tipoausencia/[id]');
    };
};//