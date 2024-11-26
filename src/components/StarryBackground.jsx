"use client"
import { useEffect, useRef } from 'react';

const StarryBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Canvas boyutunu pencere boyutuna ayarla
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Yıldız özellikleri
    const stars = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2,
      speed: Math.random() * 0.3,
      brightness: Math.random(),
      brightnessDelta: Math.random() * 0.02 - 0.01,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach(star => {
        // Parlaklık animasyonu
        star.brightness += star.brightnessDelta;
        if (star.brightness > 1 || star.brightness < 0.3) {
          star.brightnessDelta *= -1;
        }

        // Yıldızları çiz
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * 0.5})`;
        ctx.fill();

        // Yıldızları hareket ettir
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10"
      style={{ background: 'linear-gradient(to bottom, #0f172a, #1e293b)' }}
    />
  );
};

export default StarryBackground;