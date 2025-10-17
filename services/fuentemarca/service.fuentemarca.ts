"use server"

import { db } from "@vercel/postgres";

const client = db;

export async function getFuenteMarcaManual() {
    try {
        const texto = `
            SELECT id
            FROM fuentemarca
            WHERE nombre = 'Manual'
        `;

        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getFuenteMarcaManual: ", error);
        throw error;
    };
};

export async function getFuenteMarcaControl() {
    try {
        const texto = `
            SELECT id
            FROM fuentemarca
            WHERE nombre = 'Control de Acceso'
        `;

        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getFuenteMarcaControl: ", error);
        throw error;
    };
};