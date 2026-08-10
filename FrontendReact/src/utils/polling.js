export const INTERVALO_ACTUALIZACION_MS = 180000;

export function iniciarPollingSeguro(
    tarea,
    intervaloMs = INTERVALO_ACTUALIZACION_MS
) {
    let detenido = false;
    let ejecutando = false;
    let temporizador = null;

    const puedeConsultar = () =>
        !document.hidden && (typeof navigator === "undefined" || navigator.onLine);

    const programar = () => {
        if (detenido) return;
        clearTimeout(temporizador);
        temporizador = setTimeout(() => ejecutar(false), intervaloMs);
    };

    const ejecutar = async (cargaInicial) => {
        if (detenido) return;
        if (ejecutando || !puedeConsultar()) {
            programar();
            return;
        }

        ejecutando = true;
        try {
            await tarea(cargaInicial);
        } catch (error) {
            console.error("Error durante la actualización automática", error);
        } finally {
            ejecutando = false;
            programar();
        }
    };

    const reanudar = () => {
        if (!detenido && puedeConsultar() && !ejecutando) {
            clearTimeout(temporizador);
            ejecutar(false);
        }
    };

    document.addEventListener("visibilitychange", reanudar);
    window.addEventListener("online", reanudar);
    ejecutar(true);

    return () => {
        detenido = true;
        clearTimeout(temporizador);
        document.removeEventListener("visibilitychange", reanudar);
        window.removeEventListener("online", reanudar);
    };
}
