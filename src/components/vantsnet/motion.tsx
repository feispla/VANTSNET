// Componentes de movimiento de VANTSNET (F4) — framer-motion.
// Envoltorios client-side pensados para recibir contenido de server
// components como children (el patrón RSC: el cliente anima, el
// servidor renderiza). El proveedor honra prefers-reduced-motion del
// sistema vía MotionConfig reducedMotion="user": quien pida menos
// movimiento, verá apariciones instantáneas sin desplazamientos.
'use client';

import { MotionConfig, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { contenedor, hijo, aparecer } from '@/lib/motion/tokens';

/** Proveedor global del sistema de movimiento (usar una vez en el layout). */
export function ProveedorMovimiento({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.4 }}>
      {children}
    </MotionConfig>
  );
}

/** Contenedor en cascada: sus hijos <AnimItem> aparecen escalonados. */
export function AnimLista({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={contenedor}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

/** Elemento dentro de <AnimLista>. */
export function AnimItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={hijo}>
      {children}
    </motion.div>
  );
}

/** Aparición única (títulos, encabezados de sección). */
export function AnimAparecer({
  children,
  className,
  indice = 0,
}: {
  children: ReactNode;
  className?: string;
  indice?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={aparecer}
      custom={indice}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}
