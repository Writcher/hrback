"use server"

import { verifyAuthToken } from "@/lib/utils/authutils";
import { deactivateEmpleado, editEmpleado } from "@/services/empleado/service.empleado";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const { id: id_empleado } = await params;
        const parametros = await request.json();

        if (parametros.accion === "editar") {

            const editarEmpleadoParametros = {
                id: id_empleado,
                nombre: parametros.nombre as string,
                id_reloj: parametros.id_reloj as number,
                legajo: parametros.legajo as number,
            };

            await editEmpleado(editarEmpleadoParametros);

            return NextResponse.json({ message: "Empleado editado correctamente." }, { status: 200 });
        };

        const desactivarEmpleadoParametros = {
            id: id_empleado
        };

        await deactivateEmpleado(desactivarEmpleadoParametros);

        return NextResponse.json({ message: "Empleado dado de baja correctamente." }, { status: 200 });
    } catch (error) {
        console.error("Error editando empleado: ", error);
        return NextResponse.json({ error: "Error interno" })
    };
};