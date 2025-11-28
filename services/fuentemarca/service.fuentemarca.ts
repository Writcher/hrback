"use server"

import { executeQuery } from "@/lib/utils/database";
import { db } from "@vercel/postgres";

const client = db;

export async function getFuenteMarcaManual() {
    return executeQuery(
        'getFuenteMarcaManual',
        async () => {

            const getQuery = `
                SELECT id FROM fuentemarca
                WHERE nombre = 'Manual'
            `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                    INSERT INTO fuentemarca (nombre)
                    VALUES ($1)
                    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, ['Manual']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//

export async function getFuenteMarcaControl() {
    return executeQuery(
        'getFuenteMarcaControl',
        async () => {

            const getQuery = `
                SELECT id FROM fuentemarca
                WHERE nombre = 'Control de Acceso'
            `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                    INSERT INTO fuentemarca (nombre)
                    VALUES ($1)
                    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, ['Control de Acceso']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//