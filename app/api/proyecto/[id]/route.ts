import { verifyAuthToken } from "@/lib/utils/authutils";
import { handleApiError } from "@/lib/utils/error";
import { validateData } from "@/lib/utils/validation";
import { deactivateProyecto, editProyecto } from "@/services/proyecto/service.proyecto";
import { NextRequest, NextResponse } from "next/server";

type updateProyectoBody = {
    accion: string,
};

type editData = {
    nombre: string,
    id_modalidadtrabajo: number,
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const { id: id_proyecto } = await params;
        const body = await request.json();

        const validation = validateData<updateProyectoBody>(body, [
            { field: 'accion', required: true, type: 'string' }
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        if (validation.data.accion === "baja") {

            await deactivateProyecto({
                id_proyecto: id_proyecto
            });

            return NextResponse.json({ message: "Proyecto dado de baja correctamente." }, { status: 200 });
        } else if (validation.data.accion === "editar") {

            const editValidation = validateData<editData>({ 
                nombre: body.nombre,
                id_modalidadtrabajo: Number(body.id_modalidadtrabajo) 
            }, [
                { field: 'nombre', required: true, type: 'string' },
                { field: 'id_modalidadtrabajo', required: true, type: 'number' }
            ]);

            if (!editValidation.valid) {
                throw editValidation.error;
            };

            await editProyecto({
                id_proyecto: id_proyecto,
                nombre: editValidation.data.nombre,
                id_modalidadtrabajo: editValidation.data.id_modalidadtrabajo,
            });

            return NextResponse.json({ message: "Proyecto editado correctamente." }, { status: 200 });
        };
    } catch (error) {
        return handleApiError(error, 'PATCH /api/proyecto/[id]');
    };
};//