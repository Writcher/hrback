import { updateJornada } from "@/services/jornada/service.jornada";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH( request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    try {
        const { id: id_jornada } = await params;
        const parametros = await request.json();

        const entrada = parametros.entrada as string;
        const salida = parametros.salida as string;

        if (
            !entrada ||
            !salida
        ) {
            return NextResponse.json({ error: "Faltan parámetros o son inválidos" }, { status: 400 });
        };

        const updateJornadaParametro = {
            id_jornada,
            entrada,
            salida
        };

        const respuesta = updateJornada(updateJornadaParametro);
        
        return NextResponse.json({ message: "Jornada editada correctamente." }, { status: 200 });
    } catch (error) {
        console.error("Error actualizando jornada: ", error);
        return NextResponse.json({ error: "Error interno" })
    };
};