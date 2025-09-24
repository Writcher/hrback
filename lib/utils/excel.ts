import { getMeses } from "@/services/mes/service.mes";
import { getProyectos } from "@/services/proyecto/service.proyecto";

export async function getFileName(parametros: { proyecto: number, mes: number, quincena: number }) {
    const meses = await getMeses();
    const proyectos = await getProyectos();

    const getNombreMes = (mes: number | undefined) => {
        if (!mes) return "";
        const meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        return meses[mes - 1] ?? "";
    };

    const datosMes = meses.find(
        (m: { id: number; mes: number; id_año: number }) => m.id === parametros.mes
    );

    const valorMes = datosMes?.mes;
    const año = datosMes?.id_año;

    const nombreMes = getNombreMes(valorMes);

    const nombreProyecto = proyectos.find(
        (p: { id: number; nombre: string }) => p.id === parametros.proyecto
    )?.nombre;

    return `Resumen Horas - ${nombreProyecto ?? "Proyecto"} ${parametros.quincena !== 0 ? `- Quincena ${parametros.quincena} -` : "-"} ${nombreMes} de ${año ?? ""}`;
};