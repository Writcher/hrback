"use server";

import { db } from "@vercel/postgres";
import { getMesByMesParametros } from "@/lib/types/mes";
import { executeQuery } from "@/lib/utils/database";

const client = db;

export async function getMeses() {
    return executeQuery(
        'getMeses',
        async () => {

            const getQuery = `
                SELECT * FROM mes
                ORDER BY mes, id_año
            `;

            const getResult = await client.query(getQuery);

            return getResult.rows;
        }
    );
};//

export async function getMesByMes(parametros: getMesByMesParametros) {
    return executeQuery(
        'getMesByMes',
        async () => {

            const getQuery = `
                SELECT id FROM mes
                WHERE mes = $1 AND id_año = $2
            `;

            const getResult = await client.query(getQuery, [
                parametros.mes,
                parametros.id_año
            ]);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                    INSERT INTO mes (mes, id_año)
                    VALUES ($1, $2)
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, [
                    parametros.mes,
                    parametros.id_año
                ]);

                return insertResult.rows[0].id

            };

            return getResult.rows[0].id;
        },

        parametros
    );
};//