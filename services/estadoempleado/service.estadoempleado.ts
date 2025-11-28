"use server";

import { executeQuery } from "@/lib/utils/database";

import { db } from "@vercel/postgres";

const client = db;

export async function getEstadoEmpleadoBaja() {
    return executeQuery(
        'getEstadoEmpleadoBaja',
        async () => {

            const getQuery = `
                    SELECT id FROM estadoempleado
                    WHERE nombre = 'Baja'
                `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                        INSERT INTO estadoempleado (nombre)
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

export async function getEstadoEmpleadoActivo() {
    return executeQuery(
        'getEstadoEmpleadoActivo',
        async () => {

            const getQuery = `
                    SELECT id FROM estadoempleado
                    WHERE nombre = 'Activo'
                `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                        INSERT INTO estadoempleado (nombre)
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