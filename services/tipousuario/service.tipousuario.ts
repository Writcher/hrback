"use server"

import { getTipoUsuarioPorIdDTO } from "@/lib/types/tipousuario";
import { db } from "@vercel/postgres";

const client = db;

export async function getTipoUsuarioPorId(parametros: getTipoUsuarioPorIdDTO) {
    try {
        const texto = `
            SELECT *
            FROM tipousuario
            WHERE id = $1
        `;

        const valores = [parametros.id_tipousuario];
        
        const resultado = await client.query(texto, valores);
        
        return resultado.rows[0];
    } catch (error) {
        console.error("Error en getTipoUsuarioPorId: ", error);
        throw error;
    };
};