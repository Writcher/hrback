import { verifyAuthToken } from "@/lib/utils/authutils";
import { createJornada } from "@/services/jornada/service.jornada";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const parametros = await request.json();

        await createJornada(parametros);

        return NextResponse.json({ message: "Jornada creada." }, { status: 201 });
    } catch (error) {
        console.error("Error creando Jornada:", error);
        return NextResponse.json({ error: "Error creando Jornada" }, { status: 500 });
    };
};
