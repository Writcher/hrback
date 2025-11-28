"use server";

import { executeQuery } from "@/lib/utils/database";
import { db } from "@vercel/postgres";

const client = db;

export async function getTiposJornada() {
    return executeQuery(
        'getTiposJornada',
        async () => {

            const getQuery = `
                SELECT 
                    id, 
                    nombre
                FROM tipojornada
            `;

            const getResult = await client.query(getQuery);

            return getResult.rows;
        }
    );
};//

export async function getTipoJornadaAusencia() {
    return executeQuery(
        'getTipoJornadaAusencia',
        async () => {

            const getQuery = `
                SELECT id FROM tipojornada
                WHERE nombre = 'Ausencia'
            `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                    INSERT INTO tipojornada (nombre)
                    VALUES ($1)
                    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, ['Ausencia']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//