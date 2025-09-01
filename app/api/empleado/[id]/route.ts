"use server"

import { verifyAuthToken } from "@/lib/utils/authutils";
import { deactivateEmpleado } from "@/services/empleado/service.empleado";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const { id: id_empleado } = await params;

        await deactivateEmpleado(id_empleado);

        return NextResponse.json({ message: "Jornada eliminada correctamente." }, { status: 200 });
    } catch (error) {
        console.error("Error eliminando jornada: ", error);
        return NextResponse.json({ error: "Error interno" })
    };
};