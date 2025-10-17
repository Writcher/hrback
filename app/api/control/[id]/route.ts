import { verifyAuthToken } from "@/lib/utils/authutils";
import { deleteControl, editControl } from "@/services/control/service.control";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const { id: id_control } = await params;
        const parametros = await request.json();

        const editControlParametros = {
            id_control: id_control,
            id_proyecto: parametros.id_proyecto as number,
            serie: parametros.serie as string,
        };

        await editControl(editControlParametros);

        return NextResponse.json({ message: "Control editado correctamente." }, { status: 200 });
    } catch (error) {
        console.error("Error editando Control: ", error);
        return NextResponse.json({ error: "Error interno" })
    };
};

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const { id: id_control } = await params;

        const deleteControlParametros = {
            id_control: id_control
        };

        await deleteControl(deleteControlParametros);

        return NextResponse.json({ message: "Control eliminada correctamente." }, { status: 200 });
    } catch (error) {
        console.error("Error eliminando Control: ", error);
        return NextResponse.json({ error: "Error interno" })
    };
};