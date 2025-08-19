"use server"

export type getImportacionesParametros = {
    filtroIncompletas: boolean;
    filtroProyecto: number;
    pagina: number;
    filasPorPagina: number;
};

export type  getImportacionJornadasParametros = {
    id_importacion: number;
    filtroMarcasIncompletas: boolean;
    pagina: number;
    filasPorPagina: number;
};