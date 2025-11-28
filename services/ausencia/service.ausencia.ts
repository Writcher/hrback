"use server"

import { insertAusenciaParametros, updateAusenciaTipoAusenciaParametros } from "@/lib/types/ausencia";
import { checkRowsAffected, executeQuery } from "@/lib/utils/database";
import { db } from "@vercel/postgres";

const client = db;

export async function insertAusencia(parametros: insertAusenciaParametros) {
    return executeQuery(
        'insertAusencia',
        async () => {
            
            const insertQuery = `
                INSERT INTO ausencia (id_empleado, id_tipoausencia)
                VALUES ($1, $2)
                RETURNING id
            `;

            const insertResult = await client.query(insertQuery, [
                parametros.id_empleado,
                parametros.id_tipoausencia
            ]);

            checkRowsAffected(insertResult, 'Ausencia');

            return insertResult.rows[0].id;
        },

        parametros
    );
};//

export async function updateAusenciaTipoAusencia(parametros: updateAusenciaTipoAusenciaParametros) {
    return executeQuery(
        'updateAusenciaTipoAusencia',
        async () => {

            const updateQuery = `
                UPDATE ausencia
                SET id_tipoausencia = $1
                WHERE id = $2
            `;

            const updateResult = await client.query(updateQuery, [
                parametros.id_tipoAusencia,
                parametros.id
            ]);

            checkRowsAffected(updateResult, 'Ausencia');
        },

        parametros
    );
};//