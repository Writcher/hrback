"use server";

import { getProyectos } from "@/services/proyecto/service.proyecto";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const respuesta = await getProyectos();
        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error buscando proyectos:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    };
};