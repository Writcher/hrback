import { verifyAuthToken } from "@/lib/utils/authutils";
import { getModalidadesTrabajo } from "@/services/modalidadtrabajo/service.modalidadtrabajo";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const respuesta = await getModalidadesTrabajo();

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error buscando modealidades de trabajo:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    };
};