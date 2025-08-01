import React, { useState } from "react";
import "./App.css";

const images = [
  "/IMG-20250729-WA0075.jpg",
  "/IMG-20250729-WA0076.jpg",
  "/IMG-20250729-WA0077.jpg",
  "/IMG-20250729-WA0078.jpg",
  "/IMG-20250729-WA0079.jpg",
  "/IMG-20250729-WA0081.jpg",
  "/IMG-20250729-WA0080.jpg",
  "/IMG-20250729-WA0083.jpg",
  "/IMG-20250729-WA0082.jpg",
];

const animations = [
  "zoomIn",
  "slideFromRight",
  "rotateIn",
  "flipIn",
  "bounceIn",
  "fadeIn",
  "swingIn",
  "slideFromTop",
  "pulseIn",
];

const messages = [
  {
    title: "Feliz dia de la Novia para mi noviecita hermosa ❤️",
    content:
      "Cada día a tu lado es un regalo que atesoro profundamente. Tu amor ilumina mis días y llena mi vida de significado. Eres mi razón para sonreír, incluso en los momentos más simples.",
  },
  {
    title: "Mi eterno agradecimiento",
    content:
      "Gracias por ser mi apoyo incondicional, por esas palabras de aliento cuando más las necesito y por tu paciencia infinita. Eres el cimiento sobre el que construyo mis sueños y la calma en medio de mis tormentas.",
  },
  {
    title: "Eres el amor de mi vida",
    content:
      "Desde que llegaste, comprendí lo que significa amar y ser amado. Tu presencia transformó mi mundo en un lugar lleno de colores donde antes solo veía tonos grises. Eres mi mayor bendición.",
  },
  {
    title: "Nuestros momentos son los mejores",
    content:
      "Atesoro cada risa compartida, cada mirada que habla sin palabras, cada abrazo que parece durar una eternidad. Son estos pequeños instantes los que juntos tejen la gran historia de nuestro amor.",
  },
  {
    title: "Te amo más allá de las palabras puedan expresar",
    content:
      "Si el amor fuera un océano, el mío por ti no tendría orillas. Si fuera el cielo, no tendría estrellas suficientes para representar todo lo que siento. Eres mi todo.",
  },
  {
    title: "Celebrando nuestro amor",
    content:
      "Hoy no solo se celebra un día cualquiera, celebramos cada segundo que hemos construido juntos, cada obstáculo superado y cada sueño compartido. Nuestro amor es mi mayor orgullo.",
  },
  {
    title: "Mi felicidad eres tú",
    content:
      "No necesito buscar la felicidad en otro lugar cuando tengo tu sonrisa cada mañana. Eres ese rayo de sol que ilumina hasta el día más gris. Contigo, la vida sabe a dicha.",
  },
  {
    title: "Juntos patodalavida 💞",
    content:
      "Pase lo que pase, estaremos siempre unidos. Porque nuestro amor no es solo un sentimiento, es un pacto de almas que se eligieron para caminar juntas en esta vida y en todas las que vendrán.",
  },
  {
    title: "Mi princesa hermosa 💖",
    content:
      "Eres la mujer que convirtió mis cuentos de hadas en realidad. Con tu ternura, tu fuerza y tu amor incondicional, has demostrado que los finales felices sí existen. Y el mío eres tú.",
  },
];

const App = () => {
  const [index, setIndex] = useState(0);
  const [currentAnimation, setCurrentAnimation] = useState(animations[0]);

  const changeImage = (newIndex) => {
    // Desactivar animación temporalmente para reiniciarla
    setCurrentAnimation("none");
    setTimeout(() => {
      setIndex(newIndex);
      setCurrentAnimation(animations[newIndex]);
    }, 10);
  };

  const next = () => {
    const newIndex = (index + 1) % images.length;
    changeImage(newIndex);
  };

  const prev = () => {
    const newIndex = (index - 1 + images.length) % images.length;
    changeImage(newIndex);
  };

  return (
    <div className="container">
      <div className="message-card">
        <h1 className="title animate">{messages[index].title}</h1>
        <p className="message-content">{messages[index].content}</p>
      </div>

      <div className="image-wrapper">
        <img
          src={images[index]}
          alt="Nuestros momentos especiales"
          className={`photo ${currentAnimation}`}
          key={index} // Importante para reiniciar la animación
        />
      </div>

      <div className="controls">
        <button onClick={prev} className="btn">
          Anterior
        </button>
        <button onClick={next} className="btn">
          Siguiente
        </button>
      </div>

      <p className="footer">
        Con todo mi amor, para la persona que le da sentido a mi existencia, se
        que quiza no es lo que esperabas pero te amo con todo mi ser💕
      </p>
    </div>
  );
};

export default App;
