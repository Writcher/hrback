import { verifyAuthToken } from "@/lib/utils/authutils";
import { handleApiError } from "@/lib/utils/error";
import { validateData } from "@/lib/utils/validation";
import { deleteControl, editControl } from "@/services/control/service.control";
import { NextRequest, NextResponse } from "next/server";

type editControlBody = {
    id_proyecto: number,
    serie: string,
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const { id: id_control } = await params;
        const body = await request.json();

        const validation = validateData<editControlBody>(body, [
            { field: 'id_proyecto', required: true, type: 'number', min: 1 },
            { field: 'serie', required: true, type: 'string', minLength: 1, maxLength: 50 }
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        await editControl({
            id_control,
            ...validation.data
        });

        return NextResponse.json({ message: "Control editado." }, { status: 200 });
    } catch (error) {
        return handleApiError(error, 'PATCH /api/control/[id]');
    };
};//

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const { id: id_control } = await params;

        await deleteControl({
            id_control
        });

        return NextResponse.json({ message: "Control eliminada." }, { status: 200 });
    } catch (error) {
        return handleApiError(error, 'DELETE /api/control/[id]');
    };
};//