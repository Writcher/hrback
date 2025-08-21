import { verifyAuthToken } from "@/lib/utils/authutils";
import { setImportacionCompleta } from "@/services/importacion/service.importacion";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const { id } = await params;

        await setImportacionCompleta(id);

        return NextResponse.json({ message: "Jornada editada correctamente.", ok: true }, { status: 200 });
    } catch (error) {
        console.error("Error actualizando importacion: ", error);
        return NextResponse.json({ error: "Error interno" })
    };
};