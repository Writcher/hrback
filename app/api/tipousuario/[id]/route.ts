"use server"

import { getTipoUsuarioPorId } from "@/services/tipousuario/service.tipousuario";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    try {
        const { id: id_tipousuario } = await params;

        const getTipoUsuarioPorIdParametros = {
            id_tipousuario,
        };

        const respuesta = await getTipoUsuarioPorId(getTipoUsuarioPorIdParametros);

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error obteniendo tipousuario: ", error);
        return NextResponse.json({ error: "Error interno" })
    };
};