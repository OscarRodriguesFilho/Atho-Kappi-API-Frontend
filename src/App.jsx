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

// ✅ Páginas
import ConsultaIndividualPage from "./pages/consulta_individual";
import HistoricoPage from "./pages/historico"; // 🔥 NOVO

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  // 🔑 Página ativa
  const [pageKey, setPageKey] = useState("home"); // home | consulta | historico

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // =========================
  // HOME VIEW (seu layout atual)
  // =========================
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

  // =========================
  // Renderização de páginas
  // =========================
  function renderPage() {
    switch (pageKey) {
      case "consulta":
        return (
          <div className="page">
            <div className="page__container">
              <ConsultaIndividualPage refreshKey={refreshKey} />
            </div>
          </div>
        );

      case "historico": // 🔥 NOVO
        return (
          <div className="page">
            <div className="page__container">
              <HistoricoPage />
            </div>
          </div>
        );

      case "home":
      default:
        return HomeView;
    }
  }

  return (
    <>
      {/* Sidebar */}
      <Sidebar activeKey={pageKey} onNavigate={setPageKey} />

      <Header />

      {renderPage()}

      <Footer />
    </>
  );
}