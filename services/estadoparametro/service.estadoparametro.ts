"use server"

import { executeQuery } from "@/lib/utils/database";
import { db } from "@vercel/postgres";

const client = db;

export async function getEstadoParametroBaja() {
    return executeQuery(
        'getEstadoParametroBaja',
        async () => {

            const getQuery = `
                    SELECT id FROM estadoparametro
                    WHERE nombre = 'Baja'
                `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                        INSERT INTO estadoparametro (nombre)
                        VALUES ($1)
                        ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                        RETURNING id
                    `;

                const insertResult = await client.query(insertQuery, ['Baja']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//

export async function getEstadoParametroActivo() {
    return executeQuery(
        'getEstadoParametroActivo',
        async () => {

            const getQuery = `
                    SELECT id FROM estadoparametro
                    WHERE nombre = 'Activo'
                `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                        INSERT INTO estadoparametro (nombre)
                        VALUES ($1)
                        ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                        RETURNING id
                    `;

                const insertResult = await client.query(insertQuery, ['Activo']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//