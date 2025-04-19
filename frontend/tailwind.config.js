export default {
  content: [
      "./index.html",
      "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
      extend: {
          animation: {
              blob: "blob 7s infinite",
              "fade-in-up": "fadeInUp 0.5s ease-out forwards",
              shake: "shake 0.5s ease-in-out",
          },
          keyframes: {
              blob: {
                  "0%": {
                      transform: "translate(0px, 0px) scale(1)",
                  },
                  "33%": {
                      transform: "translate(30px, -50px) scale(1.1)",
                  },
                  "66%": {
                      transform: "translate(-20px, 20px) scale(0.9)",
                  },
                  "100%": {
                      transform: "translate(0px, 0px) scale(1)",
                  },
              },
              fadeInUp: {
                  "0%": {
                      opacity: "0",
                      transform: "translateY(20px)",
                  },
                  "100%": {
                      opacity: "1",
                      transform: "translateY(0)",
                  },
              },
              shake: {
                  "0%, 100%": {
                      transform: "translateX(0)",
                  },
                  "10%, 30%, 50%, 70%, 90%": {
                      transform: "translateX(-5px)",
                  },
                  "20%, 40%, 60%, 80%": {
                      transform: "translateX(5px)",
                  },
              },
          },
          transitionDelay: {
              2000: "2000ms",
              4000: "4000ms",
          },
      },
  },
  plugins: [],
};
