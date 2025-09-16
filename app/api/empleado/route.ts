import { verifyAuthToken } from "@/lib/utils/authutils";
import { insertEmpleado } from "@/services/empleado/service.empleado";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const parametros = await request.json();

        await insertEmpleado(parametros);

        return NextResponse.json({ message: "Jornada creada." }, { status: 201 });
    } catch (error) {
        console.error("Error creando Empleado:", error);
        return NextResponse.json({ error: "Error creando Empleado" }, { status: 500 });
    };
};
