import Link from "next/link";
import React, { useState, useEffect } from "react";
import { Logo } from "./logo";

const Nav = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled ? "bg-black/10 backdrop-blur-md border-b" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <Link href={"/"} className="flex items-center gap-2">
         <Logo />
          <p className="font-mono">
            No<span className="text-[#4ADE80]">NetPay</span>
          </p>
        </Link>
        <Link href={"https://youtu.be/icikfAPobLw"} target="_blank">
        <button
          className="hidden md:flex border-gray-700 text-gray-300 justify-between items-center px-6 py-3 border hover:bg-white hover:text-black transition-colors duration-200 ease-in-out group text-xs"
        >
          View Demo
          <svg
            className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200 ease-in-out"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button></Link>
      </div>
    </div>
  );
};

export default Nav;
