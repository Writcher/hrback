import { verifyAuthToken } from "@/lib/utils/authutils";
import { createControl } from "@/services/control/service.control";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const parametros = await request.json();

        await createControl(parametros);

        return NextResponse.json({ message: "Control creado." }, { status: 201 });
    } catch (error) {
        console.error("Error creando Control:", error);
        return NextResponse.json({ error: "Error creando Control" }, { status: 500 });
    };
};
