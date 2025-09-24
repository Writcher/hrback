export type insertObservacionParametros = {
    observacion: string,
};

export type getObservacionesResumenParametros = {
    id_empleado: number,
    filtroMes: number,
    filtroQuincena: number,
    pagina: number,
    filasPorPagina: number,
};