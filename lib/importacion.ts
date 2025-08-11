"use server"

export type getImportacionesParams = {
    filtroIncompletas: boolean;
    filtroProyecto: number;
    pagina: number;
    filasPorPagina: number;
}