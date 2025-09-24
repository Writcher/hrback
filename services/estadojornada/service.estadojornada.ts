"use server";

import { db } from "@vercel/postgres";

const client = db;

export async function getEstadosJornada() {
    try {
        const texto = `
            SELECT 
            id, 
            nombre
            FROM estadojornada
        `;

        const resultado = await client.query(texto);

        return resultado.rows;
    } catch (error) {
        console.error("Error en getEstadosJornada: ", error);
        throw error;
    };
};

export async function getEstadoJornadaSinValidar() {
    try {
        const texto = `
            SELECT id
            FROM estadojornada
            WHERE nombre = 'Sin Validar'
        `;

        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getEstaroJornadaSinValidar: ", error);
        throw error;
    };
};

export async function getEstadoJornadaRevision() {
    try {
        const texto = `
            SELECT id
            FROM estadojornada
            WHERE nombre = 'Requiere Revision'
        `;

        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getEstaroJornadaRevision: ", error);
        throw error;
    };
};

export async function getEstadoJornadaValida() {
    try {
        const texto = `
            SELECT id
            FROM estadojornada
            WHERE nombre = 'Validada'
        `;

        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getEstadoJornadaValida: ", error);
        throw error;
    };
};