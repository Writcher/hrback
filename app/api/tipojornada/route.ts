"use server";

import { getAllTiposJornada } from "@/services/tipojornada/service.tipojornada";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const response = await getAllTiposJornada();
        return NextResponse.json(response, { status: 200 });
    } catch (error) {
        console.error("Error buscando tipos de jornada:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    };
};