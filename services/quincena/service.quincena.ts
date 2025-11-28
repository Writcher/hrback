"use server";

import { getQuincenaByMesParametros } from "@/lib/types/quincena";
import { executeQuery } from "@/lib/utils/database";
import { db } from "@vercel/postgres"

const client = db;

export async function getQuincenaByMes(parametros: getQuincenaByMesParametros) {
    return executeQuery(
        'getQuincenaByMes',
        async () => {

            const getQuery = `
                SELECT id FROM quincena
                WHERE quincena = $1 AND id_mes = $2
            `;

            const getResult = await client.query(getQuery, [
                parametros.quincena,
                parametros.id_mes
            ]);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                    INSERT INTO quincena (quincena, id_mes)
                    VALUES ($1, $2)
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, [
                    parametros.quincena,
                    parametros.id_mes
                ]);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        },

        parametros
    );
};//