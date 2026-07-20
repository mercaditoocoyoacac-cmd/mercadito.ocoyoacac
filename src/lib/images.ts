export const shimmerBlur =
  "data:image/svg+xml;base64," +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#f5f0eb"/><rect x="0" y="0" width="100" height="100" fill="url(#g)"><animate attributeName="opacity" values="0.4;0.6;0.4" dur="2s" repeatCount="indefinite"/></rect><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e8e0d8"/><stop offset="100%" stop-color="#d4ccc4"/></linearGradient></defs></svg>',
  );
