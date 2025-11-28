import { verifyAuthToken } from "@/lib/utils/authutils";
import { handleApiError } from "@/lib/utils/error";
import { validateData } from "@/lib/utils/validation";
import { createControl } from "@/services/control/service.control";
import { NextRequest, NextResponse } from "next/server";

type createControlBody = {
    id_proyecto: number;
    serie: string;
};

export async function POST(request: NextRequest) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const body = await request.json();

        const validation = validateData<createControlBody>(body, [
            { field: 'id_proyecto', required: true, type: 'number', min: 1 },
            { field: 'serie', required: true, type: 'string', minLength: 1, maxLength: 50 }
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        await createControl({
            ...validation.data
        });

        return NextResponse.json({ message: "Control creado." }, { status: 201 });
    } catch (error) {
        return handleApiError(error, 'POST /api/control');
    };
};//
