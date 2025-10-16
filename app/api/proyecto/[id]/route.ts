import { verifyAuthToken } from "@/lib/utils/authutils";
import { deactivateProyecto, editProyecto } from "@/services/proyecto/service.proyecto";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const { id: id_proyecto } = await params;
        const parametros = await request.json();

        if (parametros.accion === "baja") {
            
            const deactivateProyectoParametros = {
                id_proyecto: id_proyecto
            };

            await deactivateProyecto(deactivateProyectoParametros);

            return NextResponse.json({ message: "Proyecto dado de baja correctamente." }, { status: 200 });
        };

        if (parametros.accion === "editar") {

            const editProyectoParametros = {
                id_proyecto: id_proyecto,
                nombre: parametros.nombre as string,
                id_modalidadtrabajo: parametros.id_modalidadtrabajo as number,
            };

            await editProyecto(editProyectoParametros);

            return NextResponse.json({ message: "Proyecto editado correctamente." }, { status: 200 });
        };
    } catch (error) {
        console.error("Error editando proyecto: ", error);
        return NextResponse.json({ error: "Error interno" })
    };
};