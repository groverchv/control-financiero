import { useEffect, useRef } from 'react';

/**
 * Componente Confeti ligero basado en Canvas HTML5 para celebraciones sin dependencias externas.
 * Garantiza ejecutarse una sola vez por evento sin reiniciar por re-renders del padre.
 */
export const Confetti = ({ active = false, duration = 2500, onComplete }) => {
  const canvasRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  // Mantener siempre la referencia más reciente del callback sin reiniciar la animación
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let isCancelled = false;
    const startTime = Date.now();

    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#eab308', '#a855f7', '#ff7849'];
    const particles = [];

    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Generar partículas iniciales
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * -window.innerHeight - 10,
        r: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.05 + 0.02,
        tiltAngle: 0,
        speed: Math.random() * 3 + 2.5,
      });
    }

    const draw = () => {
      if (isCancelled || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let allOffScreen = true;
      const elapsed = Date.now() - startTime;

      particles.forEach((p) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += p.speed;
        p.x += Math.sin(p.tiltAngle) * 0.6;

        if (p.y < canvas.height) {
          allOffScreen = false;
        }

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      });

      // Detener si expiró la duración o cayeron todas las partículas
      if (elapsed >= duration || allOffScreen) {
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      } else {
        animationFrameId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [active, duration]); // Se ejecuta estrictamente cuando 'active' pasa de false a true

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[99999]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};
