"use server"

export type getEmpleadosParams = {
    busquedaNombre: string,
    filtroProyecto: number,
    pagina: number,
    filasPorPagina: number,
    ordenColumna: string,
    ordenDireccion: string
};

export type getEmpleadoJornadasParams = {
    idEmpleado: number,
    filtroMes: number,
    filtroQuincena: number,
    filtroMarcasIncompletas: boolean,
    pagina: number,
    filasPorPagina: number,
};