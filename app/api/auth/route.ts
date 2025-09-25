import { verifyAuthToken } from "@/lib/utils/authutils";
import { createJornada } from "@/services/jornada/service.jornada";
import { getUsuarioContraseñaPorId } from "@/services/usuario/service.usuario";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const parametros = await request.json();

        const getUsuarioContraseñaPorIdParametros = {
            id: parametros.id,
        };

        const contraseña = await getUsuarioContraseñaPorId(getUsuarioContraseñaPorIdParametros);

        const match = await bcrypt.compare(parametros.contraseña, contraseña);

        if (match) {
            return NextResponse.json({ message: "Contraseña correcta." }, { status: 200 });
        } else if (!match) {
            return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
        };
    } catch (error) {
        console.error("Error comparando contraseña:", error);
        return NextResponse.json({ error: "Error comparando contraseña" }, { status: 500 });
    };
};
