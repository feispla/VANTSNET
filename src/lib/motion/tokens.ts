// Tokens del sistema de movimiento de VANTSNET (F4).
// Filosofía: sutil y con propósito — la UI informa, no entretiene.
// Todos los presets son entradas suaves (fade + desplazamiento mínimo);
// NADA rebota ni distrae del dato. La accesibilidad manda: MotionConfig
// reducedMotion="user" en el proveedor honra la preferencia del sistema.

export const DURACION = {
  /** Micro-interacciones y elementos above-the-fold */
  rapida: 0.25,
  /** Entradas de tarjetas y secciones */
  normal: 0.4,
  /** Transiciones de página / hero */
  lenta: 0.6,
} as const;

export const EASE = {
  /** Curva estándar suave (ease-out acentuado) */
  salida: [0.16, 1, 0.3, 1],
  /** Entradas discretas (sin overshoot) */
  suave: [0.25, 0.1, 0.25, 1],
} as const;

export const DESPLAZAMIENTO = {
  /** px que un elemento sube al aparecer (máximo: sutil) */
  entrada: 10,
} as const;

/** Variante de aparición individual: fade + subir */
export const aparecer = {
  hidden: { opacity: 0, y: DESPLAZAMIENTO.entrada },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: DURACION.normal, ease: EASE.salida, delay: i * 0.05 },
  }),
};

/** Variante de contenedor: orquesta hijos en cascada */
export const contenedor = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

/** Variante de hijo dentro de un contenedor en cascada */
export const hijo = {
  hidden: { opacity: 0, y: DESPLAZAMIENTO.entrada },
  visible: { opacity: 1, y: 0, transition: { duration: DURACION.normal, ease: EASE.salida } },
};
