"use server";

import { db } from "@vercel/postgres";

const client = db;

export async function getAllProyectos(){
    try {
        const textProyectos = `
            SELECT 
            id AS value, 
            nombre AS label 
            FROM proyecto
        `;
        const proyectosResult = await client.query(textProyectos);
        return proyectosResult.rows;
    } catch (error) {
        console.error("Error en getAllProyectos: ", error);
        throw error;
    };
};