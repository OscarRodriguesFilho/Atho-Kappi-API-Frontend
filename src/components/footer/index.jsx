import React from "react";
import "./index.css";

export default function Footer() {
  return (
    <footer className="kc-footer">
      <div className="kc-footer__container">
        {/* LEFT */}
        <div className="kc-footer__left">
          <a className="kc-footer__brand" href="https://kuaracapital.com" target="_blank" rel="noreferrer">
            <img
              className="kc-footer__logo"
              src="https://kuaracapital.com/wp-content/uploads/2022/06/Asset-1.png"
              alt="Kuará Capital"
            />
          </a>

          <p className="kc-footer__text">
            As informações, materiais ou documentos aqui disponibilizadas não caracterizam e não devem ser entendidos como
            recomendação de investimento, análise de valor mobiliário, material promocional, participação em qualquer
            estratégia de negócio, solicitação/oferta/esforço de venda ou distribuição de cotas dos fundos de investimento
            aqui descritos.
          </p>

          <a className="kc-footer__link" href="https://kuaracapital.com/disclaimer/" target="_blank" rel="noreferrer">
            Leia Mais
          </a>

          {/* Badge / imagem (como na sua referência) */}
          <div className="kc-footer__badgeWrap">
            <img
              className="kc-footer__badge"
              src="https://kuaracapital.com/wp-content/uploads/2022/07/WhatsApp-Image-2023-05-26-at-11.07.25-300x225.jpeg"
              alt="Certificação / Selo"
            />
          </div>
        </div>

        {/* RIGHT */}
        <div className="kc-footer__right">
          <nav className="kc-footer__nav" aria-label="Links do rodapé">
            <a href="https://kuaracapital.com/" target="_blank" rel="noreferrer">
              HOME
            </a>
            <a href="https://kuaracapital.com/sobre-nos/" target="_blank" rel="noreferrer">
              SOBRE NÓS
            </a>
            <a href="https://kuaracapital.com/conteudos/" target="_blank" rel="noreferrer">
              CONTEÚDOS
            </a>
            <a href="https://kuaracapital.com/produtos/" target="_blank" rel="noreferrer">
              PRODUTOS
            </a>
            <a href="https://kuaracapital.com/contato/" target="_blank" rel="noreferrer">
              CONTATO
            </a>
            <a href="https://kuaracapital.com/politica-de-privacidade/" target="_blank" rel="noreferrer">
              POLÍTICA DE PRIVACIDADE
            </a>
          </nav>

          <div className="kc-footer__social" aria-label="Redes sociais">
            <a
              className="kc-footer__iconBtn"
              href="https://www.instagram.com/kuaracapital/"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              title="Instagram"
            >
              {/* Instagram */}
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9z" />
                <path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                <path d="M17.6 6.4a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z" />
              </svg>
            </a>

            <a
              className="kc-footer__iconBtn"
              href="https://www.linkedin.com/company/kuaracapital/about/"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              title="LinkedIn"
            >
              {/* LinkedIn */}
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5zM3.5 21h3V9h-3v12zM9 9h2.9v1.64h.04c.4-.76 1.38-1.56 2.84-1.56C18.1 9.08 20 10.6 20 14v7h-3v-6.2c0-1.48-.03-3.38-2.06-3.38-2.06 0-2.38 1.6-2.38 3.28V21H9V9z" />
              </svg>
            </a>

            <a
              className="kc-footer__iconBtn"
              href="mailto:faleconosco@kuaracapital.com"
              target="_blank"
              rel="noreferrer"
              aria-label="E-mail"
              title="E-mail"
            >
              {/* Envelope */}
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm0 2v.3l8 5.2 8-5.2V8H4zm16 2.1-7.4 4.8a1 1 0 0 1-1.2 0L4 10.1V18h16v-7.9z" />
              </svg>
            </a>
          </div>

          <div className="kc-footer__copy">
            <div>2022 Kuará Capital. Todos os direitos reservados.</div>
            <div>
              Designed by Korie Studio.{" "}
              <a href="https://kuaracapital.com/politica-de-privacidade/" target="_blank" rel="noreferrer">
                Política de Privacidade.
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
