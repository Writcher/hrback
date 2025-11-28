"use server"

export type getEmpleadosParametros = {
    busquedaNombre: string,
    filtroProyecto: number,
    pagina: number,
    filasPorPagina: number,
    ordenColumna: string,
    ordenDireccion: string,
    busquedaLegajo: number,
    filtroTipoEmpleado: number,
    filtroTipoAusencia: number,
    filtroMes: number,
    filtroQuincena: number,
    filtroMarcaManual: boolean,
};

export type getAusentesParametros = {
    filtroProyecto: number,
    fecha: string,
};

export type getEmpleadoJornadasParametros = {
    id_empleado: number,
    filtroMes: number,
    filtroQuincena: number,
    filtroMarcasIncompletas: boolean,
    pagina: number,
    filasPorPagina: number,
    ausencias: boolean,
    filtroTipoAusencia: number,
};//

export type getEmpleadoJornadasResumenParametros = {
    id_empleado: number,
    filtroMes: number,
    filtroQuincena: number,
};//

export type getJornadasResumenParametros = {
    proyecto: number,
    mes: number,
    quincena: number,
};

export type insertEmpleadoParametros = {
    id_reloj: number,
    id_proyecto: number,
    legajo: number | null,
    nombre: string,
    id_tipoempleado: number | null,
};

export type editEmpleadoParametros = {
    id_reloj: number,
    legajo: number,
    nombre: string,
    id: number,
    id_tipoempleado: number,
    id_turno: number,
    id_proyecto: number,
};

export type deactivateEmpleadoParametros = {
    id: number,
};

export type getEmpleadoByRelojProyectoParametros = {
    id_reloj: number,
    id_proyecto: number,
    id_tipoimportacion: number,
};

export type getEmpleadoProyectoParametros = {
    id: number,
};

export type getProyectoEmpleadosNocturnosParametros = {
    id_proyecto: number;
};