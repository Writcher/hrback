"use server";

import { executeQuery } from "@/lib/utils/database";
import { db } from "@vercel/postgres";

const client = db;

export async function getEstadosImportacion() {
    return executeQuery(
        'getEstadosImportacion',
        async () => {

            const getQuery = `
                SELECT * FROM estadoimportacion
            `

            const getResult = await client.query(getQuery);

            return getResult.rows;
        }
    );
};//

export async function getEstadoImportacionIncompleta() {
    return executeQuery(
        'getEstadoImportacionIncompleta',
        async () => {

            const getQuery = `
                SELECT id FROM estadoimportacion
                WHERE nombre = 'Incompleta'
            `

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                    INSERT INTO estadoimportacion (nombre)
                    VALUES ($1)
                    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, ['Incompleta']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//

export async function getEstadoImportacionRevision() {
    return executeQuery(
        'getEstadoImportacionIncompleta',
        async () => {

            const getQuery = `
                SELECT id FROM estadoimportacion
                WHERE nombre = 'Revision'
            `

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                    INSERT INTO estadoimportacion (nombre)
                    VALUES ($1)
                    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, ['Revision']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//

export async function getEstadoImportacionCompleta() {
    return executeQuery(
        'getEstadoImportacionIncompleta',
        async () => {

            const getQuery = `
                SELECT id FROM estadoimportacion
                WHERE nombre = 'Completa'
            `

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                    INSERT INTO estadoimportacion (nombre)
                    VALUES ($1)
                    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, ['Completa']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//