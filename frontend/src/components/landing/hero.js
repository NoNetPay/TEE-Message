import React from "react";
import { Typewriter } from "react-simple-typewriter";

const HeroSection = () => {
  return (
    <div className="relative w-full md:h-[95vh] overflow-hidden">
      <style>
        {`
         @keyframes cursorBlink {
           0% { opacity: 1; }
           50% { opacity: 0; }
           100% { opacity: 1; }
         }
         .custom-cursor {
           display: inline-block;
           width: 24px;
           height: 1em;
           background-color: #4ADE80;
           margin-left: 2px;
           animation: cursorBlink 1s infinite;
         }
       `}
      </style>

      {/* Animated Grid Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="relative h-full w-full">
          {[...Array(20)].map((_, i) => (
            <div
              key={`h-${i}`}
              className="absolute w-full h-px bg-white/30"
              style={{
                top: `${(i + 1) * 5}%`,
                transform: "scaleX(1.1)",
                animation: `breatheX ${3 + (i % 2)}s infinite ease-in-out`,
              }}
            />
          ))}
          {[...Array(20)].map((_, i) => (
            <div
              key={`v-${i}`}
              className="absolute h-full w-px bg-white/30"
              style={{
                left: `${(i + 1) * 5}%`,
                transform: "scaleY(1.1)",
                animation: `breatheY ${3 + (i % 2)}s infinite ease-in-out`,
              }}
            />
          ))}
          {[...Array(400)].map((_, i) => {
            const row = Math.floor(i / 20);
            const col = i % 20;
            return (
              <div
                key={`intersection-${i}`}
                className="absolute w-1 h-1 bg-white/10"
                style={{
                  top: `${(row + 1) * 5}%`,
                  left: `${(col + 1) * 5}%`,
                  animation: `pulse ${2 + (i % 3)}s infinite ease-in-out ${
                    (row + col) * 0.1
                  }s`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Vignette effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />

      {/* Content */}
      <div className="relative z-10 h-full">
        <div className="flex flex-col justify-center h-full max-w-8xl mx-auto relative px-6">
          <div className="flex items-end w-full justify-between border-b md:border-b-0 pb-12 mt-52">
            <div className="leading-tight tracking-tighter">
              <h1 className="text-4xl md:text-7xl font-extralight text-white tracking-tighter leading-none">
                Access
              </h1>
              <h1 className="text-4xl md:text-7xl text-nowrap font-extralight text-green-400 tracking-tighter leading-none mb-2" >
                <Typewriter
                  words={["Payments", "Crypto", "Finance"]}
                  loop={true}
                  cursor={true}
                  cursorStyle={<span className="custom-cursor" />}
                  typeSpeed={70}
                  deleteSpeed={50}
                  delaySpeed={1000}
                />
              </h1>
              <h1 className="text-4xl md:text-7xl font-extralight text-white tracking-tighter leading-none">
                Without Internet
              </h1>
            </div>
            <p className="hidden md:block mt-4 text-gray-400 text-xs font-mono">
              <span className="text-white">/// CONNECTED.</span> EVEN OFFLINE.
            </p>
          </div>
          <p className="md:hidden block my-4 text-gray-400 text-xs font-mono">
            <span className="text-white">/// CONNECTED.</span> EVEN OFFLINE.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideRight {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }
        
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(100%); }
        }
        
        @keyframes pulse {
          0% { transform: scale(0.5); opacity: 0.3; }
          50% { transform: scale(1.5); opacity: 0.8; }
          100% { transform: scale(0.5); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default HeroSection;
