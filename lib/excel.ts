"use server";

export type instancesVerification = {
    año: number;
    mes: number;
    quincena: number;
}

export type jornadasMap = Map<string, {
    nombre: string;
    registros: {
        fecha: string;
        hora: string;
        tipo: string;
    }[];
}>;

export type idForaneas = {
    mesId: number;
    quincenaId: number;
};

export type jornadasData = {
    map: jornadasMap;
    id_proyecto: number;
    id_tipojornada: number;
};
