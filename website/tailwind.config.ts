import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary backgrounds
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-elevated': 'var(--bg-elevated)',

        // Accent colors
        'accent-cyan': 'var(--accent-cyan)',
        'accent-blue': 'var(--accent-blue)',
        'accent-purple': 'var(--accent-purple)',

        // Text colors
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',

        // Hairline
        'line': 'var(--line)',
      },
      fontFamily: {
        'display': 'var(--font-display)',
        'body': 'var(--font-body)',
        'mono': 'var(--font-mono)',
      },
      maxWidth: {
        'container': 'var(--container-max)',
      },
      spacing: {
        'section': 'var(--section-padding)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        // Brand ramp: deep violet → violet → teal (name kept for legacy JSX)
        'gradient-cyber': 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue), var(--accent-cyan))',
      },
      boxShadow: {
        // Legacy names, paper-toned values
        'glow-sm': '0 1px 2px rgba(76, 60, 32, 0.06), 0 4px 12px -6px rgba(76, 60, 32, 0.10)',
        'glow-md': '0 2px 4px rgba(76, 60, 32, 0.06), 0 10px 24px -10px rgba(76, 60, 32, 0.16)',
        'glow-lg': '0 3px 6px rgba(76, 60, 32, 0.07), 0 18px 40px -14px rgba(76, 60, 32, 0.20)',
        'glow-xl': '0 4px 8px rgba(76, 60, 32, 0.08), 0 26px 56px -18px rgba(76, 60, 32, 0.24)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.7)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'pulseGlow 2s ease-in-out infinite',
      },
      transitionDelay: {
        '1000': '1000ms',
        '2000': '2000ms',
      },
    },
  },
  plugins: [],
} satisfies Config;
