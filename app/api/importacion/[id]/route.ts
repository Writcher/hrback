import { verifyAuthToken } from "@/lib/utils/authutils";
import { handleApiError } from "@/lib/utils/error";
import { deleteImportacion, setImportacionCompleta } from "@/services/importacion/service.importacion";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const { id: id_importacion } = await params;

        await setImportacionCompleta({
            id: id_importacion
        });

        return NextResponse.json({ message: "Jornada editada correctamente.", ok: true }, { status: 200 });
    } catch (error) {
        return handleApiError(error, 'PATCH /api/importacion/[id]');
    };
};//

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const { id: id_importacion } = await params;

        await deleteImportacion({
            id: id_importacion
        });

        return NextResponse.json({ message: "Importacion eliminada correctamente." }, { status: 200 });
    } catch (error) {
        return handleApiError(error, 'DELETE /api/importacion/[id]');
    };
};//