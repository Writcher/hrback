import { handleApiError } from "@/lib/utils/error";
import { getTipoUsuarioPorId } from "@/services/tipousuario/service.tipousuario";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    try {
        const { id: id_tipousuario } = await params;

        const respuesta = await getTipoUsuarioPorId({
            id_tipousuario,
        });

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        return handleApiError(error, 'GET /api/tipousuario/[id]');
    };
};//