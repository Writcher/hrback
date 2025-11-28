import { verifyAuthToken } from "@/lib/utils/authutils";
import { handleApiError } from "@/lib/utils/error";
import { validateData } from "@/lib/utils/validation";
import { updateAusenciaTipoAusencia } from "@/services/ausencia/service.ausencia";
import { deleteJornada, getJornadaAusencia, updateJornada, validateJornada } from "@/services/jornada/service.jornada";
import { NextRequest, NextResponse } from "next/server";

type updateJornadaBody = {
    accion: string,
};

type justificarData = {
    tipoAusencia: number,
};

type editarData = {
    entrada: string,
    salida: string,
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const { id: id_jornada } = await params;

        const id_usuariomodificacion = Number(payload.id);
        const body = await request.json();

        const validation = validateData<updateJornadaBody>(body, [
            { field: 'accion', required: true, type: 'string' }
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        if (validation.data.accion === "validar") {

            await validateJornada({
                id_jornada,
                id_usuariomodificacion
            });

            return NextResponse.json({ message: "Jornada validada correctamente." }, { status: 200 });
        } else if (validation.data.accion === "justificar") {

            const justificarValidation = validateData<justificarData>({
                tipoAusencia: Number(body.tipoAusencia)
            }, [
                { field: 'tipoAusencia', required: true, type: 'number' }
            ]);

            if (!justificarValidation.valid) {
                throw justificarValidation.error;
            };

            const ausencia = await getJornadaAusencia({
                id: id_jornada,
            });

            await updateAusenciaTipoAusencia({
                id: ausencia,
                id_tipoAusencia: justificarValidation.data.tipoAusencia
            });

            return NextResponse.json({ message: "Ausencia validada correctamente." }, { status: 200 });
        } else if (validation.data.accion === "editar") {

            const editarValidation = validateData<editarData>({
                entrada: body.entrada as string,
                salida: body.salida as string,
            }, [
                { field: 'entrada', required: true, type: 'string' },
                { field: 'salida', required: true, type: 'string' }
            ]);

            if (!editarValidation.valid) {
                throw editarValidation.error;
            };

            await updateJornada({
                id_jornada,
                entrada: editarValidation.data.entrada,
                salida: editarValidation.data.salida,
                id_usuariomodificacion
            });

            return NextResponse.json({ message: "Jornada editada correctamente." }, { status: 200 });
        };
    } catch (error) {
        return handleApiError(error, 'PATCH /api/jornada/[id]');
    };
};

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const { id: id_jornada } = await params;

        await deleteJornada({
            id: id_jornada,
        });

        return NextResponse.json({ message: "Jornada eliminada correctamente." }, { status: 200 });
    } catch (error) {
        return handleApiError(error, 'DELETE /api/jornada/[id]');
    };
};