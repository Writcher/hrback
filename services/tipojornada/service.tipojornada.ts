"use server";

import { db } from "@vercel/postgres";

const client = db;

export async function getAllTiposJornada(){
    try {
        const textProyectos = `
            SELECT 
            id AS value, 
            nombre AS label 
            FROM tipojornada
        `;
        const proyectosResult = await client.query(textProyectos);
        return proyectosResult.rows;
    } catch (error) {
        console.error("Error en getAllTiposJornada: ", error);
        throw error;
    };
};