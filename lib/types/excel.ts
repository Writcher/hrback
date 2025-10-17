"use server";

export type getMesQuincenaParametros = {
    año: number;
    mes: number;
    quincena: number;
};

export type empleadosJornada = Map<string, {
    nombre: string;
    registros: {
        fecha: string;
        hora: string;
        tipo: string;
    }[];
    requiresManualReview: boolean;
}>;

export type clavesForaneas = {
    id_mes: number;
    id_quincena: number;
};

export type jornadasParametros = {
    empleadosJornadas: { empleadosJornada: empleadosJornada, importacionCompleta: boolean };
    id_proyecto: number;
    id_tipojornada: number;
    nombreArchivo: string;
    id_tipoimportacion: number;
    id_usuariocreacion: number;
};
