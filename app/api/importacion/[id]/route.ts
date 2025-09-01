import { verifyAuthToken } from "@/lib/utils/authutils";
import { deleteImportacion, setImportacionCompleta } from "@/services/importacion/service.importacion";
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const { id: id_importacion } = await params;

        await deleteImportacion(id_importacion);

        return NextResponse.json({ message: "Importacion eliminada correctamente." }, { status: 200 });
    } catch (error) {
        console.error("Error eliminando importacion: ", error);
        return NextResponse.json({ error: "Error interno" })
    };
};