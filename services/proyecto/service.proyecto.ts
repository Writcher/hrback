"use server";

import { db } from "@vercel/postgres";

const client = db;

export async function getProyectos(){
    try {
        const texto = `
            SELECT 
            id, 
            nombre
            FROM proyecto
        `;

        const resultado = await client.query(texto);
        
        return resultado.rows;
    } catch (error) {
        console.error("Error en getProyectos: ", error);
        throw error;
    };
};