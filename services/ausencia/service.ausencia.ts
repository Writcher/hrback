"use server"

import { insertAusenciaParametros, updateAusenciaTipoAusenciaParametros } from "@/lib/types/ausencia";
import { db } from "@vercel/postgres";

const client = db;

export async function insertAusencia(parametros: insertAusenciaParametros) {
    try {
        const texto = `
            INSERT INTO ausencia (id_empleado, id_tipoausencia)
            VALUES ($1, $2)
            RETURNING id
        `;

        const valores = [parametros.id_empleado, parametros.id_tipoausencia];

        const resultado = await client.query(texto, valores);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en insertAusencia: ", error);
        throw error;
    };
};

export async function updateAusenciaTipoAusencia(parametros: updateAusenciaTipoAusenciaParametros) {
    try {
        const texto = `
            UPDATE ausencia
            SET id_tipoausencia = $1
            WHERE id = $2
        `;

        const valores = [parametros.id_tipoAusencia, parametros.id];

        await client.query(texto, valores);
    } catch (error) {
        console.error("Error en updateAusenciaTipoAusencia: ", error);
        throw error;
    };
};