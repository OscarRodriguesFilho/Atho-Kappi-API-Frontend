// src/App.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

import Header from "./components/header";
import Footer from "./components/footer";

import Cadastro from "./components/cadastro";
import Upload from "./components/upload";
import Automatizacoes from "./components/automatizacoes";
import Kpis from "./components/kpis";
import Tabela from "./components/tabela";
import Regras from "./components/regras";

import Sidebar from "./components/sidebar";

import ConsultaIndividualPage from "./pages/consulta_individual/index";
import HistoricoPage from "./pages/historico";
import LoginPage from "./pages/login";

const API_BASE = "http://localhost:5502";

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  const [pageKey, setPageKey] = useState("home");

  // ✅ doc/cpf que o histórico manda pra consulta
  const [consultaDoc, setConsultaDoc] = useState("");

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // ✅ logs (pode manter — não aparece na tela)
  useEffect(() => {
    console.log("[APP] pageKey =", pageKey);
  }, [pageKey]);

  useEffect(() => {
    console.log("[APP] consultaDoc =", consultaDoc);
  }, [consultaDoc]);

  // =========================
  // Checar sessão ao abrir
  // =========================
  useEffect(() => {
    let alive = true;

    async function checkSession() {
      setAuthLoading(true);

      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!alive) return;
        setIsAuthed(res.ok);
      } catch {
        if (!alive) return;
        setIsAuthed(false);
      } finally {
        if (!alive) return;
        setAuthLoading(false);
      }
    }

    checkSession();

    return () => {
      alive = false;
    };
  }, []);

  // =========================
  // Logout
  // =========================
  async function handleLogout() {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout falhou:", err);
    } finally {
      setIsAuthed(false);
      setPageKey("home");
      setConsultaDoc("");
    }
  }

  // =========================
  // HOME VIEW
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
  // Render pages
  // =========================
  function renderPage() {
    switch (pageKey) {
      case "consulta":
        return (
          <div className="page">
            <div className="page__container">
              {/*
                ✅ FORÇA remount quando o CPF muda
                - evita ficar mostrando prop velha
              */}
              <ConsultaIndividualPage
                key={consultaDoc || "none"}
                refreshKey={refreshKey}
                initialDoc={consultaDoc}
              />
            </div>
          </div>
        );

      case "historico":
        return (
          <div className="page">
            <div className="page__container">
              <HistoricoPage
                onOpenDoc={(docDigits) => {
                  console.log("[APP] onOpenDoc recebeu:", docDigits);

                  // ✅ garante string (evita undefined / null)
                  const next = (docDigits || "").toString();

                  // ✅ seta doc e navega
                  setConsultaDoc(next);
                  setPageKey("consulta");

                  console.log("[APP] setConsultaDoc =", next, "-> indo pra pagina consulta");
                }}
              />
            </div>
          </div>
        );

      case "home":
      default:
        return HomeView;
    }
  }

  // =========================
  // LOADING SCREEN
  // =========================
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--kuara-bg)",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <img
            src="https://kuaracapital.com/wp-content/uploads/2022/06/Asset-1.png"
            alt="Kuará Capital"
            style={{
              width: 180,
              maxWidth: "70vw",
              marginBottom: 18,
              filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.25))",
            }}
          />

          <div
            style={{
              color: "white",
              opacity: 0.85,
              fontWeight: 500,
              fontSize: 15,
            }}
          >
            Carregando sistema...
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // LOGIN
  // =========================
  if (!isAuthed) {
    return (
      <LoginPage
        onSuccess={() => {
          setIsAuthed(true);
          setPageKey("home");
        }}
      />
    );
  }

  // =========================
  // APP
  // =========================
  return (
    <>
      <Sidebar activeKey={pageKey} onNavigate={setPageKey} onLogout={handleLogout} />

      <Header />

      {renderPage()}

      <Footer />
    </>
  );
}