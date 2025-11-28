import { verifyAuthToken } from "@/lib/utils/authutils";
import { handleApiError } from "@/lib/utils/error";
import { validateData } from "@/lib/utils/validation";
import { createJornada } from "@/services/jornada/service.jornada";
import { NextRequest, NextResponse } from "next/server";

type postJornadaBody = {
    entrada: string | null;
    salida: string | null;
    entradaTarde: string | null;
    salidaTarde: string | null;
    fecha: string;
    id_tipojornada: number | "";
    id_tipoausencia: number | "";
    duracionAusencia: number | "";
    observacion: string;
    id_empleado: number;
};

export async function POST(request: NextRequest) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const id_usuariocreacion = Number(payload.id);
        const body = await request.json();

        const validation = validateData<postJornadaBody>(body, [
            { field: 'id_empleado', required: true, type: 'number' },
            { field: 'observacion', required: false, type: 'string' },
            { field: 'duracionAusencia', required: false },
            { field: 'id_tipoausencia', required: false },
            { field: 'id_tipojornada', required: false },
            { field: 'fecha', required: true, type: 'string' },
            { field: 'entrada', required: false },
            { field: 'salida', required: false },
            { field: 'entradaTarde', required: false },
            { field: 'salidaTarde', required: false },
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        await createJornada({ ...validation.data, id_usuariocreacion });

        return NextResponse.json({ message: "Jornada creada." }, { status: 201 });
    } catch (error) {
        return handleApiError(error, 'POST /api/jornada');
    };
};//
