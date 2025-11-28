"use server";

import { db } from "@vercel/postgres";
import { getAñoByValorParametros, insertAñoParametros } from "../../lib/types/año";
import { executeQuery } from "@/lib/utils/database";

const client = db;

export async function getAñoByValor(parametros: getAñoByValorParametros) {
    return executeQuery(
        'getAñoByValor',
        async () => {

            const getQuery = `
                SELECT valor FROM año
                WHERE valor = $1
            `;

            const getResult = await client.query(getQuery, [parametros.valor]);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                    INSERT INTO año (valor)
                    VALUES ($1)
                    ON CONFLICT (valor) DO UPDATE SET valor = EXCLUDED.valor
                    RETURNING valor
                `;

                const insertResult = await client.query(insertQuery, [parametros.valor]);

                return insertResult.rows[0].valor;
            }

            return getResult.rows[0].valor;
        },

        parametros
    );
};