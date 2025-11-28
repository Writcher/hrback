"use server";

import { executeQuery } from "@/lib/utils/database";
import { db } from "@vercel/postgres";

const client = db;

export async function getEstadoJornadaSinValidar() {
    return executeQuery(
        'getEstadoJornadaSinValidar',
        async () => {
            
            const getQuery = `
                SELECT id FROM estadojornada
                WHERE nombre = 'Sin Validar'
            `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                    INSERT INTO estadojornada (nombre)
                    VALUES ($1)
                    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, ['Sin Validar']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//

export async function getEstadoJornadaRevision() {
    return executeQuery(
        'getEstadoJornadaRevision',
        async () => {
            
            const getQuery = `
                SELECT id FROM estadojornada
                WHERE nombre = 'Requiere Revision'
            `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                    INSERT INTO estadojornada (nombre)
                    VALUES ($1)
                    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, ['Requiere Revision']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//

export async function getEstadoJornadaValida() {
    return executeQuery(
        'getEstadoJornadaValida',
        async () => {
            
            const getQuery = `
                SELECT id FROM estadojornada
                WHERE nombre = 'Validada'
            `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                    INSERT INTO estadojornada (nombre)
                    VALUES ($1)
                    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, ['Validada']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//