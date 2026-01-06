import React, { useEffect, useState } from "react";
import "./index.css";

export default function Header() {
  const [open, setOpen] = useState(false);

  // fecha o menu ao aumentar a tela
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 980) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header className="kuaraHeader">
      <div className="kuaraHeader__inner">
        <a className="kuaraHeader__brand" href="https://kuaracapital.com" target="_blank" rel="noreferrer">
          <img
            className="kuaraHeader__logo"
            src="https://kuaracapital.com/wp-content/uploads/2022/06/Asset-1.png"
            alt="Kuará Capital"
          />
        </a>

        <button
          className="kuaraHeader__burger"
          aria-label="Alternar menu"
          aria-expanded={open ? "true" : "false"}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`kuaraHeader__nav ${open ? "is-open" : ""}`} aria-label="Menu principal">
          <a className="kuaraHeader__link" href="https://kuaracapital.com/" target="_blank" rel="noreferrer">
            Home
          </a>
          <a className="kuaraHeader__link" href="https://kuaracapital.com/sobre-nos/" target="_blank" rel="noreferrer">
            Sobre Nós
          </a>

          <div className="kuaraHeader__dropdown">
            <a className="kuaraHeader__link" href="https://kuaracapital.com/conteudos/" target="_blank" rel="noreferrer">
              Conteúdos <span className="kuaraHeader__chev">▾</span>
            </a>
            <div className="kuaraHeader__dropdownMenu">
              <a href="https://kuaracapital.com/conteudos/politicas/" target="_blank" rel="noreferrer">
                Políticas
              </a>
              <a href="https://kuaracapital.com/conteudos/clipping/" target="_blank" rel="noreferrer">
                Clipping
              </a>
              <a href="https://kuaracapital.com/conteudos/artigos/" target="_blank" rel="noreferrer">
                Artigos
              </a>
            </div>
          </div>

          <div className="kuaraHeader__dropdown">
            <a className="kuaraHeader__link" href="https://kuaracapital.com/produtos/" target="_blank" rel="noreferrer">
              Produtos <span className="kuaraHeader__chev">▾</span>
            </a>
            <div className="kuaraHeader__dropdownMenu">
              <a href="https://kuaracapital.com/produtos/fundos/" target="_blank" rel="noreferrer">
                Fundos
              </a>
              <a href="https://kuaracapital.com/produtos/estrategias/" target="_blank" rel="noreferrer">
                Estratégias
              </a>
            </div>
          </div>

          <a className="kuaraHeader__link" href="https://kuaracapital.com/contato/" target="_blank" rel="noreferrer">
            Contato
          </a>

          <a className="kuaraHeader__pill" href="https://kuaracapital.com/en/" target="_blank" rel="noreferrer">
            EN
          </a>
        </nav>
      </div>
    </header>
  );
}
