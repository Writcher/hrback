import { verifyAuthToken } from "@/lib/utils/authutils";
import { deleteUsuario, editUsuario } from "@/services/usuario/service.usuario";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const { id: id_usuario } = await params;
        const parametros = await request.json();

        if (parametros.accion === "baja") {
            
            const deleteUsuarioParametros = {
                id: id_usuario
            };

            await deleteUsuario(deleteUsuarioParametros);

            return NextResponse.json({ message: "Usuario dado de baja correctamente." }, { status: 200 });
        };

        if (parametros.accion === "editar") {

            const editarUsuarioParametros = {
                id: id_usuario,
                nombre: parametros.nombre as string,
                correo: parametros.correo as string,
                id_tipousuario: parametros.id_tipousuario as number,
            };

            await editUsuario(editarUsuarioParametros);

            return NextResponse.json({ message: "Usuario editado correctamente." }, { status: 200 });
        };
    } catch (error) {
        console.error("Error editando usuario: ", error);
        return NextResponse.json({ error: "Error interno" })
    };
};