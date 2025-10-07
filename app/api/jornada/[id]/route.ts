import { verifyAuthToken } from "@/lib/utils/authutils";
import { updateAusenciaTipoAusencia } from "@/services/ausencia/service.ausencia";
import { deleteJornada, getJornadaAusencia, updateJornada, validateJornada } from "@/services/jornada/service.jornada";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const { id: id_jornada } = await params;
        const parametros = await request.json();

        if (parametros.accion === "validar") {
            await validateJornada({ id_jornada });

            return NextResponse.json({ message: "Jornada validada correctamente." }, { status: 200 });
        };

        if (parametros.accion === "justificar") {

            const id_tipoAusencia = parametros.tipoAusencia as number;

            if (isNaN(id_tipoAusencia)) {
                return NextResponse.json({ error: "Faltan parámetros o son inválidos" }, { status: 400 });
            };

            const getJornadaAusenciaParametros = {
                id: id_jornada,
            };

            const ausencia = await getJornadaAusencia(getJornadaAusenciaParametros);

            const updateAusenciaTipoAusenciaParametros = {
                id: ausencia,
                id_tipoAusencia
            };

            await updateAusenciaTipoAusencia(updateAusenciaTipoAusenciaParametros);

            return NextResponse.json({ message: "Ausencia validada correctamente." }, { status: 200 });
        };

        const entrada = parametros.entrada as string;
        const salida = parametros.salida as string;

        if (
            !entrada ||
            !salida
        ) {
            return NextResponse.json({ error: "Faltan parámetros o son inválidos" }, { status: 400 });
        };

        const updateJornadaParametro = {
            id_jornada,
            entrada,
            salida
        };

        await updateJornada(updateJornadaParametro);

        return NextResponse.json({ message: "Jornada editada correctamente." }, { status: 200 });
    } catch (error) {
        console.error("Error actualizando jornada: ", error);
        return NextResponse.json({ error: "Error interno" })
    };
};

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const { id: id_jornada } = await params;

        const deleteJornadaParametros = {
            id: id_jornada,
        };

        await deleteJornada(deleteJornadaParametros);

        return NextResponse.json({ message: "Jornada eliminada correctamente." }, { status: 200 });
    } catch (error) {
        console.error("Error eliminando jornada: ", error);
        return NextResponse.json({ error: "Error interno" })
    };
};