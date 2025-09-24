"use server";

import { verifyAuthToken } from "@/lib/utils/authutils";
import { getTiposEmpleado } from "@/services/tipoempleado/service.tipoempleado";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const respuesta = await getTiposEmpleado();

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error buscando tipos de empleado: ", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    };
};