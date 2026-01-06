// src/App.jsx
import React, { useCallback, useMemo, useState } from "react";
import "./App.css";

import Header from "./components/header";
import Footer from "./components/footer";

import Cadastro from "./components/cadastro";
import Upload from "./components/upload";
import Automatizacoes from "./components/automatizacoes";
import Kpis from "./components/kpis";
import Tabela from "./components/tabela";
import Regras from "./components/regras";

// ✅ Sidebar
import Sidebar from "./components/sidebar";

// ✅ Página nova
import ConsultaIndividualPage from "./pages/consulta_individual";

export default function App() {
  // 🔑 chave global de refresh
  const [refreshKey, setRefreshKey] = useState(0);

  // ✅ página atual
  const [pageKey, setPageKey] = useState("home"); // home | consulta | ...

  // 🔁 função chamada após upload OK
  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // ✅ renderiza a home (seu layout atual)
  const HomeView = useMemo(() => {
    return (
      <div className="page">
        <div className="page__container">
          <div className="page__full">
            <Cadastro />
          </div>

          <div className="page__grid">
            <div className="page__left">
              <Upload onUploadSuccess={triggerRefresh} />
              <Automatizacoes />
            </div>

            <div className="page__right">
              <Kpis refreshKey={refreshKey} />
              <Regras />
            </div>

            <div className="page__full">
              <Tabela refreshKey={refreshKey} />
            </div>
          </div>
        </div>
      </div>
    );
  }, [refreshKey, triggerRefresh]);

  // ✅ renderiza a página atual
  function renderPage() {
    if (pageKey === "consulta") {
      return (
        <div className="page">
          <div className="page__container">
            <ConsultaIndividualPage refreshKey={refreshKey} />
          </div>
        </div>
      );
    }

    // (por enquanto) todo resto cai na home
    return HomeView;
  }

  return (
    <>
      {/* ✅ Sidebar navegável */}
      <Sidebar activeKey={pageKey} onNavigate={setPageKey} />

      <Header />

      {renderPage()}

      <Footer />
    </>
  );
}
