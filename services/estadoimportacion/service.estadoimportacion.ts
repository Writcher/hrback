"use server";

import { db } from "@vercel/postgres";

const client = db;

export async function getEstadosImportacion() {
    try {
        const texto = `
            SELECT 
            id, 
            nombre
            FROM estadoimportacion
        `;
        const resultado = await client.query(texto);
        return resultado.rows;
    } catch (error) {
        console.error("Error en getEstadosImportacion: ", error);
        throw error;
    };
};

export async function getEstadoImportacionIncompleta() {
    try {
        const texto = `
            SELECT id
            FROM estadoimportacion
            WHERE nombre = 'Incompleta'
        `;

        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getEstadoImportacionIncompleta: ", error);
        throw error;
    };
};

export async function getEstadoImportacionRevision() {
    try {
        const texto = `
            SELECT id
            FROM estadoimportacion
            WHERE nombre = 'Revisión'
        `;

        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getEstadoImportacionRevision: ", error);
        throw error;
    };
};

export async function getEstadoImportacionCompleta() {
    try {
        const texto = `
            SELECT id
            FROM estadoimportacion
            WHERE nombre = 'Completa'
        `;

        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getEstadoImportacionCompleta: ", error);
        throw error;
    };
};