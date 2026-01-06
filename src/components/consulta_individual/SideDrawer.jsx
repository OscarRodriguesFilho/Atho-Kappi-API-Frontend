import React from "react";

export default function SideDrawer({ open, title, subtitle, onClose, children }) {
  if (!open) return null;

  return (
    <div className="ck-drawerRoot" role="dialog" aria-modal="true">
      <div className="ck-drawerOverlay" onClick={onClose} />
      <div className="ck-drawer">
        <div className="ck-drawerHead">
          <div className="ck-drawerHeadLeft">
            <div className="ck-drawerTitle">{title || "Detalhes"}</div>
            {subtitle ? <div className="ck-drawerSub">{subtitle}</div> : null}
          </div>
          <button className="ck-drawerClose" onClick={onClose} aria-label="Fechar" type="button">
            ✕
          </button>
        </div>

        <div className="ck-drawerBody">{children}</div>
      </div>
    </div>
  );
}
