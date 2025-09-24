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
        `;

        const resultado = await client.query(texto);
        
        return resultado.rows;
    } catch (error) {
        console.error("Error en getTiposImportacion: ", error);
        throw error;
    };
};