"use server";

import { executeQuery } from "@/lib/utils/database";
import { db } from "@vercel/postgres";

const client = db;

export async function getTiposImportacion() {
    return executeQuery(
        'getTiposImportacion',
        async () => {

            const getQuery = `
                SELECT * FROM tipoimportacion
                WHERE nombre != 'Ausentes'
            `;

            const getResult = await client.query(getQuery);

            return getResult.rows;
        }
    );
};//

export async function getTipoImportacionProSoft() {
    return executeQuery(
        'getTipoImportacionProSoft',
        async () => {

            const getQuery = `
                    SELECT id FROM tipoimportacion
                    WHERE nombre = 'ProSoft'
                `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                        INSERT INTO tipoimportacion (nombre)
                        VALUES ($1)
                        ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                        RETURNING id
                    `;

                const insertResult = await client.query(insertQuery, ['ProSoft']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//

export async function getTipoImportacionAusentes() {
    return executeQuery(
        'getTipoImportacionAusentes',
        async () => {

            const getQuery = `
                    SELECT id FROM tipoimportacion
                    WHERE nombre = 'Ausentes'
                `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                        INSERT INTO tipoimportacion (nombre)
                        VALUES ($1)
                        ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                        RETURNING id
                    `;

                const insertResult = await client.query(insertQuery, ['Ausentes']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//
