"use server";

import { db } from "@vercel/postgres";

const client = db;

export async function getTiposImportacion(){
    try {
        const texto = `
            SELECT 
            id, 
            nombre
            FROM tipoimportacion
            WHERE nombre != 'Ausentes'
        `;

        const resultado = await client.query(texto);
        
        return resultado.rows;
    } catch (error) {
        console.error("Error en getTiposImportacion: ", error);
        throw error;
    };
};

export async function getTipoImportacionProSoft() {
    try {
        const texto = `
            SELECT id
            FROM tipoimportacion
            WHERE nombre = 'ProSoft'
        `;

        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getTipoImportacionProSoft: ", error);
        throw error;
    };
};

export async function getTipoImportacionAusentes() {
    try {
        const texto = `
            SELECT id
            FROM tipoimportacion
            WHERE nombre = 'Ausentes'
        `;

        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getTipoImportacionAusentes: ", error);
        throw error;
    };
};