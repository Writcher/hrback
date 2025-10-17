import { verifyAuthToken } from "@/lib/utils/authutils";
import { createTipoAusencia } from "@/services/tipoausencia/service.tipoausencia";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const parametros = await request.json();

        await createTipoAusencia(parametros);

        return NextResponse.json({ message: "Tipo de Ausencia creado." }, { status: 201 });
    } catch (error) {
        console.error("Error creando Tipo de Ausencia:", error);
        return NextResponse.json({ error: "Error creando Tipo de Ausencia" }, { status: 500 });
    };
};
