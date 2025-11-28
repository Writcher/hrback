import { verifyAuthToken } from "@/lib/utils/authutils";
import { handleApiError } from "@/lib/utils/error";
import { validateData } from "@/lib/utils/validation";
import { createProyecto } from "@/services/proyecto/service.proyecto";
import { NextRequest, NextResponse } from "next/server";

type postProyectoBody = {
    id_modalidadtrabajo: number,
    nombre: string,
};

export async function POST(request: NextRequest) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const body = await request.json();

        const validation = validateData<postProyectoBody>(body, [
            { field: 'nombre', required: true, type: 'string' },
            { field: 'id_modalidadtrabajo', required: true, type: 'number' }
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        await createProyecto({
            ...validation.data
        });

        return NextResponse.json({ message: "Proyecto creado." }, { status: 201 });
    } catch (error) {
        return handleApiError(error, 'POST /api/proyecto');
    };
};//
