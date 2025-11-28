import { verifyAuthToken } from "@/lib/utils/authutils";
import { handleApiError } from "@/lib/utils/error";
import { validateData } from "@/lib/utils/validation";
import { deleteUsuario, editUsuario } from "@/services/usuario/service.usuario";
import { NextRequest, NextResponse } from "next/server";

type patchUsuarioBody = {
    accion: string,
};

type editData = {
    nombre: string,
    correo: string,
    id_tipousuario: number,
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const { id: id_usuario } = await params;
        const body = await request.json();

        const validation = validateData<patchUsuarioBody>({
            accion: body.accion as string
        }, [
            { field: 'accion', required: true, type: 'string' }
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        if (validation.data.accion === "baja") {

            await deleteUsuario({
                id: id_usuario
            });

            return NextResponse.json({ message: "Usuario dado de baja correctamente." }, { status: 200 });
        } else if (validation.data.accion === "editar") {

            const editValidation = validateData<editData>({
                nombre: body.nombre as string,
                correo: body.correo as string,
                id_tipousuario: body.id_tipousuario as number
            }, [
                { field: 'nombre', required: true, type: 'string' },
                { field: 'correo', required: true, type: 'string' },
                { field: 'id_tipousuario', required: true, type: 'number' }
            ]);

            if (!editValidation.valid) {
                throw editValidation.error;
            };

            await editUsuario({
                id: id_usuario,
                nombre: editValidation.data.nombre as string,
                correo: editValidation.data.correo as string,
                id_tipousuario: editValidation.data.id_tipousuario as number,
            });

            return NextResponse.json({ message: "Usuario editado correctamente." }, { status: 200 });
        };
    } catch (error) {
        return handleApiError(error, 'PATCH /api/usuario/[id]');
    };
};//