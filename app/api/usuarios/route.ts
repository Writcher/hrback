"use server"

import { getUsuarioPorCorreo } from "@/services/usuario/service.usuario";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const correo = url.searchParams.get("correo");

        if (
            correo === null
        ) {
            return new Response(
                JSON.stringify({ error: 'Faltan parametros' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        };

        const getUsuarioParametros = {
            correo
        };

        const respuesta = await getUsuarioPorCorreo(getUsuarioParametros);

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error buscando usuario:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    };
};