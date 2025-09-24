"use server"

import { db } from "@vercel/postgres";

const client = db;

export async function getUsuarioPorCorreo(parametros: { correo: string }) {
    try { 
        const correoMinuscula = parametros.correo.toLowerCase();

        const texto = `
            SELECT * 
            FROM "usuario"
            WHERE correo ILIKE $1
        `;

        const valores = [correoMinuscula];

        const respuesta = await client.query(texto, valores);

        return respuesta.rows[0];
    } catch (error) {
        console.error("Error en getUsuarioPorCorreo: ", error);
        throw error;
    };
};