import React from "react";
import "../../styles/Footer.css"; // You'll create this

const Footer = () => {
  return (
    <footer className="footer">
      <p>
        &copy; {new Date().getFullYear()} MTG Commander Deck Builder. Data
        fetched from ScryfallAPI.
      </p>
    </footer>
  );
};

export default Footer;
