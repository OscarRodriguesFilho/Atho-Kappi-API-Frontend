import React from "react";
import { translateKey, formatValue } from "./utils/translate";
import { isPlainObject } from "./utils/kappi";

export default function KeyValueTable({ data }) {
  if (!data) return <div className="ck-empty">Sem dados</div>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <div className="ck-empty">Sem dados</div>;

    if (data.every((x) => isPlainObject(x))) {
      return (
        <div className="ck-list">
          {data.map((item, idx) => (
            <div key={idx} className="ck-card">
              <KeyValueTable data={item} />
            </div>
          ))}
        </div>
      );
    }

    return (
      <ul className="ck-ul">
        {data.map((x, i) => (
          <li key={i}>{formatValue(x)}</li>
        ))}
      </ul>
    );
  }

  if (isPlainObject(data)) {
    const entries = Object.entries(data)
      .map(([k, v]) => {
        const tk = translateKey(k);
        return tk ? [k, tk, v] : null;
      })
      .filter(Boolean);

    if (entries.length === 0) return <div className="ck-empty">Sem dados</div>;

    return (
      <table className="ck-table">
        <thead>
          <tr>
            <th style={{ width: "280px" }}>Campo</th>
            <th>Valor</th>
          </tr>
        </thead>

        <tbody>
          {entries.map(([origK, ptK, v]) => (
            <tr key={origK}>
              <td className="ck-k">{ptK}</td>
              <td className="ck-v">
                {isPlainObject(v) || Array.isArray(v) ? (
                  <div className="ck-inlineObj">
                    <KeyValueTable data={v} />
                  </div>
                ) : (
                  <span>{formatValue(v)}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return <div className="ck-empty">{formatValue(data)}</div>;
}
