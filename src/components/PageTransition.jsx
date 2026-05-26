import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useRef } from "react";

// Ordered list — determines slide direction
const PATH_ORDER = [
  "/", "/bandeja", "/kanban", "/dashboard",
  "/carga-masiva", "/archivados", "/configuracion", "/diagnostico",
];

function getIndex(pathname) {
  const base = pathname.split("?")[0];
  const idx = PATH_ORDER.indexOf(base);
  return idx === -1 ? 0 : idx;
}

const variants = {
  initial: (dir) => ({ x: dir >= 0 ? "100%" : "-100%", opacity: 0 }),
  animate: { x: 0, opacity: 1 },
  exit:    (dir) => ({ x: dir >= 0 ? "-100%" : "100%", opacity: 0 }),
};

const transition = { type: "tween", duration: 0.22 };

export default function PageTransition({ children }) {
  const location   = useLocation();
  const prevIdx    = useRef(getIndex(location.pathname));
  const curIdx     = getIndex(location.pathname);
  const direction  = curIdx - prevIdx.current;
  prevIdx.current  = curIdx;

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={location.pathname}
        custom={direction}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}