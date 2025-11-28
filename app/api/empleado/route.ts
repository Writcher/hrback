import { verifyAuthToken } from "@/lib/utils/authutils";
import { validateData } from "@/lib/utils/validation";
import { handleApiError } from "@/lib/utils/error";
import { insertEmpleado } from "@/services/empleado/service.empleado";
import { NextRequest, NextResponse } from "next/server";

type createEmpleadoBody = {
    id_reloj: number;
    id_proyecto: number;
    legajo: number;
    nombre: string;
    id_tipoempleado: number;
};

export async function POST(request: NextRequest) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const body = await request.json();

        const validation = validateData<createEmpleadoBody>({
            id_reloj: Number(body.id_reloj),
            id_proyecto: Number(body.id_proyecto),
            legajo: Number(body.legajo),
            nombre: body.nombre,
            id_tipoempleado: Number(body.id_tipoempleado)
        }, [
            { field: 'id_reloj', required: true, type: 'number' },
            { field: 'id_proyecto', required: true, type: 'number' },
            { field: 'legajo', required: false, type: 'number' },
            { field: 'nombre', required: true, type: 'string', minLength: 1, maxLength: 100 },
            { field: 'id_tipoempleado', required: true, type: 'number' }
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        await insertEmpleado({
            ...validation.data
        });

        return NextResponse.json({ message: "Empleado creado." }, { status: 201 });
    } catch (error) {
        return handleApiError(error, 'POST /api/empleado');
    };
};
