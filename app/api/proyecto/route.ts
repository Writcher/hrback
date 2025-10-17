import { verifyAuthToken } from "@/lib/utils/authutils";
import { createProyecto } from "@/services/proyecto/service.proyecto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const parametros = await request.json();

        await createProyecto(parametros);

        return NextResponse.json({ message: "Proyecto creado." }, { status: 201 });
    } catch (error) {
        console.error("Error creando Proyecto:", error);
        return NextResponse.json({ error: "Error creando Proyecto" }, { status: 500 });
    };
};
