import { verifyAuthToken } from "@/lib/utils/authutils";
import { handleApiError } from "@/lib/utils/error";
import { getTiposJornada } from "@/services/tipojornada/service.tipojornada";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const respuesta = await getTiposJornada();

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        return handleApiError(error, 'GET /api/tiposjornada');
    };
};//