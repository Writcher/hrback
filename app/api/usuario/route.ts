import { verifyAuthToken } from "@/lib/utils/authutils";
import { handleApiError } from "@/lib/utils/error";
import { validateData } from "@/lib/utils/validation";
import { insertUsuario } from "@/services/usuario/service.usuario";
import { NextRequest, NextResponse } from "next/server";

type postUsuarioBody = {
    correo: string,
    contraseña: string,
    nombre: string,
    id_tipousuario: number,
};

export async function POST(request: NextRequest) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const body = await request.json();

        const validation = validateData<postUsuarioBody>(body, [
            { field: 'correo', required: true, type: 'string' },
            { field: 'contraseña', required: true, type: 'string' },
            { field: 'nombre', required: true, type: 'string' },
            { field: 'id_tipousuario', required: true, type: 'number' }
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        await insertUsuario({
            ...validation.data
        });

        return NextResponse.json({ message: "Usuario creado." }, { status: 201 });
    } catch (error) {
        return handleApiError(error, 'GET /api/usuario');
    };
};//
