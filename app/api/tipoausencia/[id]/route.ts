import { verifyAuthToken } from "@/lib/utils/authutils";
import { deactivateTipoAusencia, editTipoAusencia } from "@/services/tipoausencia/service.tipoausencia";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const { id: id_tipoausencia } = await params;
        const parametros = await request.json();

        if (parametros.accion === "baja") {
            
            const deactivateTipoAusenciaParametros = {
                id_tipoausencia: id_tipoausencia
            };

            await deactivateTipoAusencia(deactivateTipoAusenciaParametros);

            return NextResponse.json({ message: "Tipo de Ausencia dado de baja correctamente." }, { status: 200 });
        };

        if (parametros.accion === "editar") {

            const editTipoAusenciaParametros = {
                id_tipoausencia: id_tipoausencia,
                nombre: parametros.nombre as string,
            };

            await editTipoAusencia(editTipoAusenciaParametros);

            return NextResponse.json({ message: "Tipo de Ausencia editado correctamente." }, { status: 200 });
        };
    } catch (error) {
        console.error("Error editando Tipo de Ausencia: ", error);
        return NextResponse.json({ error: "Error interno" })
    };
};