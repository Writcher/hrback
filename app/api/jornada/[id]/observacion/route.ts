import { verifyAuthToken } from "@/lib/utils/authutils";
import { insertJornadaObservacion } from "@/services/jornadaobservacion/service.jornadaobservacion";
import { insertObservacion } from "@/services/observacion/service.observacion";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const { id: id_jornada } = await params;
        const datos = await request.json();

        const id_observacion = await insertObservacion(datos);

        await insertJornadaObservacion({ id_jornada, id_observacion });

        return NextResponse.json({ message: "Observacion creada." }, { status: 201 });
    } catch (error) {
        console.error("Error creando Observacion:", error);
        return NextResponse.json({ error: "Error creando Observacion" }, { status: 500 });
    };
};
