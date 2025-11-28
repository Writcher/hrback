import { verifyAuthToken } from "@/lib/utils/authutils";
import { validateData } from "@/lib/utils/validation";
import { createValidationError, handleApiError } from "@/lib/utils/error";
import { deactivateEmpleado, editEmpleado } from "@/services/empleado/service.empleado";
import { NextRequest, NextResponse } from "next/server";

type editEmpleadoBody = {
    accion: string,
    nombre: string,
    id_reloj: number,
    legajo: number,
    id_tipoempleado: number,
    id_turno: number,
    id_proyecto: number
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const { id: id_empleado } = await params;
        const body = await request.json();

        const validation = validateData<editEmpleadoBody>(body, [
            { field: 'accion', required: true, type: 'string' },
            { field: 'nombre', required: false, type: 'string' },
            { field: 'id_reloj', required: false, type: 'number' },
            { field: 'legajo', required: false, type: 'number' },
            { field: 'id_tipoempleado', required: false, type: 'number' },
            { field: 'id_turno', required: false, type: 'number' },
            { field: 'id_proyecto', required: false, type: 'number' },
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        if (validation.data.accion !== 'editar' && validation.data.accion !== 'deshabilitar') {
            throw createValidationError(`${validation.data.accion} is not a valid action`, 'accion');
        };

        if (validation.data.accion === 'editar') {

            await editEmpleado({
                ...validation.data,
                id: id_empleado,
            });

            return NextResponse.json({ message: "Empleado editado." }, { status: 200 });

        } else if (validation.data.accion === 'deshabilitar') {
            
            await deactivateEmpleado({
                id: id_empleado
            });

            return NextResponse.json({ message: "Empleado deshabilitado." }, { status: 200 });

        };
    } catch (error) {
        return handleApiError(error, 'PATCH /api/empleado/[id]');
    };
};//