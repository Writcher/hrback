"use server";

import { db } from "@vercel/postgres";

const client = db;

export async function getEstadosImportacion(){
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