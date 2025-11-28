"use server"

import { executeQuery } from "@/lib/utils/database";
import { db } from "@vercel/postgres";

const client = db;

export async function getTurnos() {
    return executeQuery(
        'getTurnos',
        async () => {

            const getQuery = `
                SELECT * FROM turno
            `;

            const getResult = await client.query(getQuery);

            return getResult.rows;
        }
    );
};//

export async function getTurnoNocturno() {
    return executeQuery(
        'getTurnoNocturno',
        async () => {

            const getQuery = `
                SELECT id FROM turno
                WHERE nombre = 'Nocturno'
            `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                    INSERT INTO turno (nombre)
                    VALUES ($1)
                    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, ['Nocturno']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//

export async function getTurnoDiurno() {
    return executeQuery(
        'getTurnoDiurno',
        async () => {

            const getQuery = `
                SELECT id FROM turno
                WHERE nombre = 'Diurno'
            `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                    INSERT INTO turno (nombre)
                    VALUES ($1)
                    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, ['Diurno']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//