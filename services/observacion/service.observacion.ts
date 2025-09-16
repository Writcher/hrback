"use server"

import { insertObservacionParametros } from "@/lib/types/observacion";
import { db } from "@vercel/postgres";

const client = db;

export async function insertObservacion(parametros: insertObservacionParametros) {
    try {
        const texto = `
            INSERT INTO "observacion" (texto)
            VALUES ($1)
            RETURNING id
        `;
        const valores = [parametros.observacion];

        const observacion = await client.query(texto, valores);

        return observacion.rows[0].id;
    } catch (error) {
        console.error("Error en insertObservacion: ", error);
        throw error;
    };
};