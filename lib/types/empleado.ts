"use server"

export type getEmpleadosParametros = {
    busquedaNombre: string,
    filtroProyecto: number,
    pagina: number,
    filasPorPagina: number,
    ordenColumna: string,
    ordenDireccion: string
};

export type getEmpleadoJornadasParametros = {
    id_empleado: number,
    filtroMes: number,
    filtroQuincena: number,
    filtroMarcasIncompletas: boolean,
    pagina: number,
    filasPorPagina: number,
};

export type getEmpleadoJornadasResumenParametros = {
    id_empleado: number,
    filtroMes: number,
    filtroQuincena: number,
};

export type getJornadasResumenParametros = {
    proyecto: number,
    mes: number,
    quincena: number,
};

export type insertEmpleadoParametros = {
    id_reloj: number,
    id_proyecto: number,
    legajo: number,
    nombre: string,
};