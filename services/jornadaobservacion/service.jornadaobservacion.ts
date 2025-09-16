"use server"

import { insertJornadaObservacionParametros } from "@/lib/types/jornadaobservacion";
import { db } from "@vercel/postgres";

const client = db;

export async function insertJornadaObservacion(parametros: insertJornadaObservacionParametros) {
    try {
        const texto = `
            INSERT INTO "jornadaobservacion" (id_jornada, id_observacion)
            VALUES ($1, $2)
        `;
        const valores = [parametros.id_jornada, parametros.id_observacion];

        await client.query(texto, valores);

    } catch (error) {
        console.error("Error en insertEmpleado: ", error);
        throw error;
    };
};