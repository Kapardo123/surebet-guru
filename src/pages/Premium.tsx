import React from "react";
import { Link } from "react-router-dom";

const Premium = () => {
  return (
    <div style={{ 
      backgroundColor: "red", 
      color: "white", 
      height: "100vh", 
      width: "100vw",
      display: "flex", 
      flexDirection: "column",
      alignItems: "center", 
      justifyContent: "center",
      position: "fixed",
      top: 0,
      left: 0,
      zIndex: 10000 
    }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>TEST PREMIUM PAGE</h1>
      <p>Jeśli to widzisz, nawigacja działa.</p>
      <Link to="/" style={{ color: "white", marginTop: "20px", textDecoration: "underline" }}>Wróć do strony głównej</Link>
    </div>
  );
};

export default Premium;
