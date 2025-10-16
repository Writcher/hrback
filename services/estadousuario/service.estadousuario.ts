"use server"

import { db } from "@vercel/postgres";

const client = db;

export async function getEstadoUsuarioBaja(){
    try {
        const texto = `
            SELECT 
            id
            FROM estadousuario
            WHERE nombre = 'Baja'
        `;
        
        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getEstadoUsuarioBaja: ", error);
        throw error;
    };
};

export async function getEstadoUsuarioActivo(){
    try {
        const texto = `
            SELECT 
            id
            FROM estadousuario
            WHERE nombre = 'Activo'
        `;
        
        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getEstadoUsuarioActivo: ", error);
        throw error;
    };
};